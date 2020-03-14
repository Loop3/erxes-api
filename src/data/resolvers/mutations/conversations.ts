import * as strip from 'strip';
import * as _ from 'underscore';
import { ConversationMessages, Conversations, Customers, Integrations } from '../../../db/models';
import Messages from '../../../db/models/ConversationMessages';
import {
  CONVERSATION_STATUSES,
  KIND_CHOICES,
  MESSAGE_TYPES,
  NOTIFICATION_CONTENT_TYPES,
  NOTIFICATION_TYPES,
} from '../../../db/models/definitions/constants';
import { IMessageDocument } from '../../../db/models/definitions/conversationMessages';
import { IConversationDocument } from '../../../db/models/definitions/conversations';
import { IMessengerData } from '../../../db/models/definitions/integrations';
import { IUserDocument } from '../../../db/models/definitions/users';
import { debugExternalApi } from '../../../debuggers';
import { sendMessage } from '../../../messageBroker';
import { graphqlPubsub } from '../../../pubsub';
import { checkPermission, requireLogin } from '../../permissions/wrappers';
import { IContext } from '../../types';
import utils from '../../utils';

export interface IConversationMessageAdd {
  conversationId: string;
  content: string;
  mentionedUserIds?: string[];
  internal?: boolean;
  attachments?: any;
  flowActionId?: string;
}

interface IReplyFacebookComment {
  conversationId: string;
  commentId: string;
  content: string;
}

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
 * conversation notrification receiver ids
 */
export const conversationNotifReceivers = (
  conversation: IConversationDocument,
  currentUserId: string,
  exclude: boolean = true,
): string[] => {
  let userIds: string[] = [];

  // assigned user can get notifications
  if (conversation.assignedUserId) {
    userIds.push(conversation.assignedUserId);
  }

  // participated users can get notifications
  if (conversation.participatedUserIds && conversation.participatedUserIds.length > 0) {
    userIds = _.union(userIds, conversation.participatedUserIds);
  }

  // exclude current user
  if (exclude) {
    userIds = _.without(userIds, currentUserId);
  }

  return userIds;
};

/**
 * Using this subscription to track conversation detail's assignee, tag, status
 * changes
 */
export const publishConversationsChanged = (_ids: string[], type: string): string[] => {
  for (const _id of _ids) {
    graphqlPubsub.publish('conversationChanged', {
      conversationChanged: { conversationId: _id, type },
    });
  }

  return _ids;
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

const sendNotifications = async ({
  user,
  conversations,
  type,
  mobile,
  messageContent,
}: {
  user: IUserDocument;
  conversations: IConversationDocument[];
  type: string;
  mobile?: boolean;
  messageContent?: string;
}) => {
  for (const conversation of conversations) {
    const doc = {
      createdUser: user,
      link: `/inbox/index?_id=${conversation._id}`,
      title: 'Conversation updated',
      content: messageContent ? messageContent : conversation.content || 'Conversation updated',
      notifType: type,
      receivers: conversationNotifReceivers(conversation, user._id),
      action: 'updated conversation',
      contentType: NOTIFICATION_CONTENT_TYPES.CONVERSATION,
      contentTypeId: conversation._id,
    };

    switch (type) {
      case NOTIFICATION_TYPES.CONVERSATION_ADD_MESSAGE:
        doc.action = `sent you a message`;
        doc.receivers = conversationNotifReceivers(conversation, user._id);
        break;
      case NOTIFICATION_TYPES.CONVERSATION_ASSIGNEE_CHANGE:
        doc.action = 'has assigned you to conversation ';
        break;
      case 'unassign':
        doc.notifType = NOTIFICATION_TYPES.CONVERSATION_ASSIGNEE_CHANGE;
        doc.action = 'has removed you from conversation';
        break;
      case NOTIFICATION_TYPES.CONVERSATION_STATE_CHANGE:
        doc.action = `changed conversation status to ${(conversation.status || '').toUpperCase()}`;
        break;
    }

    await utils.sendNotification(doc);

    if (mobile) {
      // send mobile notification ======
      await utils.sendMobileNotification({
        title: doc.title,
        body: strip(doc.content),
        receivers: conversationNotifReceivers(conversation, user._id, false),
        customerId: conversation.customerId,
        conversationId: conversation._id,
      });
    }
  }
};

const conversationMutations = {
  /**
   * Create new message in conversation
   */
  async conversationMessageAdd(_root, doc: IConversationMessageAdd, { user, dataSources }: IContext) {
    const conversation = await Conversations.getConversation(doc.conversationId);
    const integration = await Integrations.getIntegration(conversation.integrationId);

    await sendNotifications({
      user,
      conversations: [conversation],
      type: NOTIFICATION_TYPES.CONVERSATION_ADD_MESSAGE,
      mobile: true,
      messageContent: doc.content,
    });

    // do not send internal message to third service integrations
    if (doc.internal) {
      const messageObj = await ConversationMessages.addMessage(doc, user._id);

      // publish new message to conversation detail
      publishMessage(messageObj);

      return messageObj;
    }

    const kind = integration.kind;
    const integrationId = integration.id;
    const conversationId = conversation.id;

    const customer = await Customers.findOne({ _id: conversation.customerId });

    // if conversation's integration kind is form then send reply to
    // customer's email
    const email = customer ? customer.primaryEmail : '';

    if (kind === KIND_CHOICES.LEAD && email) {
      utils.sendEmail({
        toEmails: [email],
        title: 'Reply',
        template: {
          data: doc.content,
        },
      });
    }

    let requestName;
    let type;
    let action;

    if (kind === KIND_CHOICES.FACEBOOK_POST) {
      type = 'facebook';
      action = 'reply-post';

      return sendConversationToIntegrations(type, integrationId, conversationId, requestName, doc, dataSources, action);
    }

    const message = await ConversationMessages.addMessage(doc, user._id);

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
      requestName = 'replyWhatsPro';
    }

    await sendConversationToIntegrations(type, integrationId, conversationId, requestName, doc, dataSources, action);

    const dbMessage = await ConversationMessages.getMessage(message._id);

    // Publishing both admin & client
    publishMessage(dbMessage, conversation.customerId);

    return dbMessage;
  },

  async conversationsReplyFacebookComment(_root, doc: IReplyFacebookComment, { user, dataSources }: IContext) {
    const conversation = await Conversations.getConversation(doc.conversationId);
    const integration = await Integrations.getIntegration(conversation.integrationId);

    await sendNotifications({
      user,
      conversations: [conversation],
      type: NOTIFICATION_TYPES.CONVERSATION_ADD_MESSAGE,
      mobile: true,
      messageContent: doc.content,
    });

    const requestName = 'replyFacebookPost';
    const integrationId = integration.id;
    const conversationId = doc.commentId;
    const type = 'facebook';
    const action = 'reply-post';

    try {
      await sendConversationToIntegrations(type, integrationId, conversationId, requestName, doc, dataSources, action);
    } catch (e) {
      debugExternalApi(e.message);
      throw new Error(e.message);
    }
  },

  /**
   * Assign employee to conversation
   */
  async conversationsAssign(
    _root,
    { conversationIds, assignedUserId }: { conversationIds: string[]; assignedUserId: string },
    { user }: IContext,
  ) {
    const conversations: IConversationDocument[] = await Conversations.assignUserConversation(
      conversationIds,
      assignedUserId,
    );

    // notify graphl subscription
    publishConversationsChanged(conversationIds, 'assigneeChanged');

    await sendNotifications({ user, conversations, type: NOTIFICATION_TYPES.CONVERSATION_ASSIGNEE_CHANGE });

    return conversations;
  },

  /**
   * Unassign employee from conversation
   */
  async conversationsUnassign(_root, { _ids }: { _ids: string[] }, { user }: IContext) {
    const oldConversations = await Conversations.find({ _id: { $in: _ids } });
    const updatedConversations = await Conversations.unassignUserConversation(_ids);

    await sendNotifications({
      user,
      conversations: oldConversations,
      type: 'unassign',
    });

    // notify graphl subscription
    publishConversationsChanged(_ids, 'assigneeChanged');

    return updatedConversations;
  },

  /**
   * Change conversation status
   */
  async conversationsChangeStatus(_root, { _ids, status }: { _ids: string[]; status: string }, { user }: IContext) {
    const { conversations } = await Conversations.checkExistanceConversations(_ids);

    await Conversations.changeStatusConversation(_ids, status, user._id);

    // notify graphl subscription
    publishConversationsChanged(_ids, status);

    for (const conversation of conversations) {
      if (status === CONVERSATION_STATUSES.CLOSED) {
        const customer = await Customers.getCustomer(conversation.customerId);
        const integration = await Integrations.getIntegration(conversation.integrationId);

        const messengerData: IMessengerData = integration.messengerData || {};
        const notifyCustomer = messengerData.notifyCustomer || false;

        if (notifyCustomer && customer.primaryEmail) {
          // send email to customer
          utils.sendEmail({
            toEmails: [customer.primaryEmail],
            title: 'Conversation detail',
            template: {
              name: 'conversationDetail',
              data: {
                conversationDetail: {
                  title: 'Conversation detail',
                  messages: await ConversationMessages.find({
                    conversationId: conversation._id,
                  }),
                  date: new Date(),
                },
              },
            },
          });
        }
      }
    }

    const updatedConversations = await Conversations.find({ _id: { $in: _ids } });

    await sendNotifications({
      user,
      conversations: updatedConversations,
      type: NOTIFICATION_TYPES.CONVERSATION_STATE_CHANGE,
    });

    return updatedConversations;
  },

  /**
   * Conversation mark as read
   */
  async conversationMarkAsRead(_root, { _id }: { _id: string }, { user }: IContext) {
    return Conversations.markAsReadConversation(_id, user._id);
  },

  async conversationDeleteVideoChatRoom(_root, { name }, { dataSources }: IContext) {
    try {
      return await dataSources.IntegrationsAPI.deleteDailyVideoChatRoom(name);
    } catch (e) {
      debugExternalApi(e.message);

      throw new Error(e.message);
    }
  },

  async conversationCreateVideoChatRoom(_root, { _id }, { dataSources, user }: IContext) {
    let message;

    try {
      const doc = {
        conversationId: _id,
        internal: false,
        contentType: MESSAGE_TYPES.VIDEO_CALL,
      };

      message = await ConversationMessages.addMessage(doc, user._id);

      return await dataSources.IntegrationsAPI.createDailyVideoChatRoom({
        erxesApiConversationId: _id,
        erxesApiMessageId: message._id,
      });
    } catch (e) {
      debugExternalApi(e.message);

      await ConversationMessages.deleteOne({ _id: message._id });

      throw new Error(e.message);
    }
  },
};

requireLogin(conversationMutations, 'conversationMarkAsRead');

checkPermission(conversationMutations, 'conversationMessageAdd', 'conversationMessageAdd');
checkPermission(conversationMutations, 'conversationsAssign', 'assignConversation');
checkPermission(conversationMutations, 'conversationsUnassign', 'assignConversation');
checkPermission(conversationMutations, 'conversationsChangeStatus', 'changeConversationStatus');

export default conversationMutations;
