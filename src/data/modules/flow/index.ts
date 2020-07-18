import * as strip from 'strip';
import {
  ConversationMessages,
  Conversations,
  Flows,
  Integrations,
  Users,
  FlowActions,
  Customers,
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
import { IConversationMessageAdd } from '../../resolvers/mutations/conversations';
import { graphqlPubsub } from '../../../pubsub';
import Messages from '../../../db/models/ConversationMessages';

const handleCondition = (condition: IFlowActionValueCondition, content: string = '') => {
  switch (condition.operator) {
    case '=':
      return condition.values.includes(content);
    default:
      return false;
  }
};

const handleMessage = async (msg: IMessageDocument) => {
  const conversation = await Conversations.getConversation(msg.conversationId);

  if (!conversation) return;

  const integration = await Integrations.getIntegration(conversation?.integrationId);

  if (!integration) return;

  let flowAction: IFlowActionDocument | null = null;
  let sendNextMessage = false;

  if (conversation?.currentFlowActionId) {
    flowAction = await FlowActions.getFlowAction(conversation.currentFlowActionId);

    if (flowAction) {
      switch (flowAction.type) {
        case 'erxes.action.send.message':
          flowAction = await FlowActions.findOne({
            flowId: integration.flowId,
            order: flowAction.order + 1,
          });

          if (flowAction?.type === 'erxes.action.send.message') sendNextMessage = true;

          break;
        case 'erxes.action.to.ask':
          const { conditions }: IFlowActionValue = JSON.parse(flowAction.value || '{}');

          const condition = conditions.find(c => handleCondition(c, msg.content));

          if (condition) {
            switch (condition.action) {
              case 'erxes.action.execute.action':
                flowAction = await FlowActions.findOne({
                  flowId: integration.flowId,
                  order: condition.value,
                });
                break;
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
        flowId: integration.flowId,
        order: 0,
      });

      sendNextMessage = true;
    }
  }

  if (!flowAction) return;

  await Conversations.updateConversation(conversation.id, {
    currentFlowActionId: flowAction.id,
  });

  switch (flowAction.type) {
    case 'erxes.action.send.message':
      await handleSendMessage(flowAction, conversation);
      break;

    case 'erxes.action.to.ask':
      await handleSendMessage(flowAction, conversation);
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

  const length = content.length - 1;
  const random = Math.random();
  const position = Math.round(length * random);

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

  if (kind === KIND_CHOICES.WHATSAPP) {
    requestName = 'replyWhatsapp';
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

    doc.content += '\n\n```WhatsPro Bot```';
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
