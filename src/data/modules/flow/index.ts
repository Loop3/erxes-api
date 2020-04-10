import * as strip from 'strip';
import {
  ConversationMessages,
  Conversations,
  Flows,
  Integrations,
  Users,
  FlowActions,
  Customers,
  Channels,
} from '../../../db/models';

import { IntegrationsAPI } from '../../dataSources';

import { IMessageDocument } from '../../../db/models/definitions/conversationMessages';
import {
  IFlowActionDocument,
  IFlowActionValue,
  IFlowActionValueCondition,
} from '../../../db/models/definitions/flowActions';
import { IConversationDocument } from '../../../db/models/definitions/conversations';
import { sendMessage } from '../../../messageBroker';
import { KIND_CHOICES } from '../../../db/models/definitions/constants';
import { IConversationMessageAdd, publishConversationsChanged } from '../../resolvers/mutations/conversations';
import { graphqlPubsub } from '../../../pubsub';
import Messages from '../../../db/models/ConversationMessages';

const actionWithSendNext = ['erxes.action.send.message', 'erxes.action.define.department'];

const handleCondition = (condition: IFlowActionValueCondition, content: string = '') => {
  switch (condition.operator) {
    case '=':
      return condition.values.includes(content);
    default:
      return false;
  }
};

const handleMessage = async (msg: IMessageDocument) => {
  if (msg.isGroupMsg || !msg.content) return;

  let conversation = await Conversations.getConversation(msg.conversationId);

  if (!conversation) return;

  const integration = await Integrations.getIntegration(conversation?.integrationId);

  if (!integration || !integration.flowId) return;

  const flow = await Flows.getFlow(integration.flowId);

  if (!flow || (conversation.assignedUserId && conversation.assignedUserId !== flow.assignedUserId)) return;

  const user = await Users.findById(flow.assignedUserId);

  if (!user) return;

  if (!conversation.assignedUserId) {
    const conversations: IConversationDocument[] = await Conversations.assignUserConversation(
      [conversation.id],
      user.id,
    );

    conversation = conversations[0];

    // notify graphl subscription
    publishConversationsChanged([conversation.id], 'assigneeChanged');

    for (const conversation of conversations) {
      let message = await ConversationMessages.addMessage({
        conversationId: conversation._id,
        content: `${user.details?.shortName || user.email} has been assigned to this conversation`,
        fromBot: true,
      });

      graphqlPubsub.publish('conversationClientMessageInserted', {
        conversationClientMessageInserted: message,
      });
    }
  }

  let flowAction: IFlowActionDocument | null = null;
  let sendNextMessage = false;

  if (conversation?.currentFlowActionId) {
    flowAction = await FlowActions.findById(conversation.currentFlowActionId);

    if (flowAction) {
      switch (flowAction.type) {
        case 'erxes.action.root':
        case 'erxes.action.define.department':
        case 'erxes.action.send.message':
          flowAction = await FlowActions.findOne({
            flowId: flowAction.flowId,
            order: flowAction.order + 1,
          });

          // if (actionWithSendNext.includes(flowAction?.type || ""))
          // 	sendNextMessage = true;

          break;
        case 'erxes.action.execute.autmations.flow':
          flowAction = await FlowActions.findOne({
            flowId: flowAction?.value,
            order: 0,
          });

          await Conversations.updateConversation(conversation.id, {
            currentFlowActionId: flowAction?.id,
          });
          break;
        case 'erxes.action.to.ask':
          const { conditions }: IFlowActionValue = JSON.parse(flowAction.value || '{}');

          const condition = conditions.find(c => handleCondition(c, msg.content));

          if (condition) {
            switch (condition.action) {
              case 'erxes.action.execute.action':
                flowAction = await FlowActions.findOne({
                  flowId: flowAction.flowId,
                  order: condition.value,
                });

                break;
              case 'erxes.action.transfer.to.agent':
                let assignedUserId: string = '';

                let channel = await Channels.findById(conversation.channelId);

                if (channel && channel.memberIds?.length) {
                  let position = channel.memberIds.length - 1;

                  position = Math.round(position * Math.random());

                  assignedUserId = channel.memberIds[position];
                }

                if (!assignedUserId) {
                  let users = await Users.aggregate([
                    {
                      $match: {
                        brandIds: { $in: [integration.brandId] },
                      },
                    },
                    { $sample: { size: 1 } },
                  ]);

                  if (users?.length) {
                    assignedUserId = users[0].id;
                  }
                }

                if (assignedUserId) {
                  const conversations: IConversationDocument[] = await Conversations.assignUserConversation(
                    [conversation.id],
                    assignedUserId,
                  );

                  // notify graphl subscription
                  publishConversationsChanged([conversation.id], 'assigneeChanged');

                  let assignedUser = await Users.getUser(assignedUserId);

                  for (const conversation of conversations) {
                    let message = await ConversationMessages.addMessage({
                      conversationId: conversation._id,
                      content: `${assignedUser.details?.shortName ||
                        assignedUser.email} has been assigned to this conversation`,
                      fromBot: true,
                    });

                    graphqlPubsub.publish('conversationClientMessageInserted', {
                      conversationClientMessageInserted: message,
                    });
                  }
                }

                return;
              default:
                break;
            }
          }
          break;
        default:
          break;
      }
    }
  }

  if (!flowAction) {
    if (integration?.flowId) {
      flowAction = await FlowActions.findOne({
        flowId: flow.id,
        order: 0,
      });

      if (actionWithSendNext.includes(flowAction?.type || '')) sendNextMessage = true;
    }
  }

  if (!flowAction) return;

  await Conversations.updateConversation(conversation.id, {
    currentFlowActionId: flowAction.id,
  });

  switch (flowAction.type) {
    case 'erxes.action.send.message':
      await handleSendMessage(flowAction, conversation);

      if (
        await FlowActions.findOne({
          flowId: flowAction.flowId,
          order: flowAction.order + 1,
        })
      )
        sendNextMessage = true;

      break;
    case 'erxes.action.to.ask':
      await handleSendMessage(flowAction, conversation);
      break;

    case 'erxes.action.define.department':
      Conversations.updateConversation(conversation.id, {
        channelId: flowAction.value,
      });

      if (
        await FlowActions.findOne({
          flowId: flowAction.flowId,
          order: flowAction.order + 1,
        })
      )
        sendNextMessage = true;

      break;
    case 'erxes.action.execute.autmations.flow':
      sendNextMessage = true;

      break;

    default:
      break;
  }

  if (sendNextMessage) {
    await handleMessage(msg);
  }
};

const handleSendMessage = async (flowAction: IFlowActionDocument, conversation: IConversationDocument) => {
  const integration = await Integrations.getIntegration(conversation.integrationId);

  if (!integration) return;

  const kind = integration.kind;
  const integrationId = integration.id;
  const conversationId = conversation.id;

  const customer = await Customers.findById(conversation.customerId);

  if (!customer) return;

  const flow = await Flows.findById(integration.flowId);

  if (!flow) return;

  const user = await Users.findById(flow?.assignedUserId);

  if (!user) return;

  const { content }: IFlowActionValue = JSON.parse(flowAction.value || '[]');

  let position = content.length - 1;

  position = Math.round(position * Math.random());

  const doc: IConversationMessageAdd = {
    conversationId,
    flowActionId: flowAction.id,
    internal: false,
    content: content[position],
  };

  const message = await ConversationMessages.addMessage(doc, user._id);

  let requestName;
  let type;
  let action;

  // send reply to facebook
  if (kind === KIND_CHOICES.FACEBOOK_MESSENGER) {
    type = 'facebook';
    action = 'reply-messenger';
  }

  // send reply to chatfuel
  if (kind === KIND_CHOICES.CHATFUEL) {
    requestName = 'replyChatfuel';
  }

  if (kind === KIND_CHOICES.TWITTER_DM) {
    requestName = 'replyTwitterDm';
  }

  if (kind === KIND_CHOICES.WHATSPRO) {
    type = 'whatspro';
    requestName = 'replyWhatsPro';
  }

  await sendConversationToIntegrations(
    type,
    integrationId,
    conversationId,
    requestName,
    doc,
    { IntegrationsAPI: new IntegrationsAPI() },
    action,
  );

  const dbMessage = await ConversationMessages.getMessage(message._id);

  // Publishing both admin & client
  publishMessage(dbMessage, conversation.customerId);
};

/**
 *  Send conversation to integrations
 */

const sendConversationToIntegrations = (
  type: string,
  integrationId: string,
  conversationId: string,
  requestName: string,
  doc: IConversationMessageAdd,
  dataSources: any,
  action?: string,
) => {
  if (type === 'facebook') {
    return sendMessage('erxes-api:integrations-notification', {
      action,
      type,
      payload: JSON.stringify({
        integrationId,
        conversationId,
        content: strip(doc.content),
        attachments: doc.attachments || [],
      }),
    });
  }

  if (type === 'whatspro') {
    doc.content = doc.content.replace(/<\/?(b|strong)>/g, '*');
    doc.content = doc.content.replace(/<br ?\/?>/g, '\n');
    doc.content = doc.content.replace(/<\/?i>/g, '_');
    doc.content = doc.content.replace(/<\/?s>/g, '~');
  }

  if (dataSources && dataSources.IntegrationsAPI && requestName) {
    return dataSources.IntegrationsAPI[requestName]({
      conversationId,
      integrationId,
      content: strip(doc.content),
      attachments: doc.attachments || [],
    });
  }
};

/**
 * Publish admin's message
 */
export const publishMessage = async (message: IMessageDocument, customerId?: string) => {
  graphqlPubsub.publish('conversationMessageInserted', {
    conversationMessageInserted: message,
  });

  // widget is listening for this subscription to show notification
  // customerId available means trying to notify to client
  if (customerId) {
    const unreadCount = await Messages.widgetsGetUnreadMessagesCount(message.conversationId);

    graphqlPubsub.publish('conversationAdminMessageInserted', {
      conversationAdminMessageInserted: {
        customerId,
        unreadCount,
      },
    });
  }
};

export default {
  handleMessage,
};
