import {
  handleClickEvent,
  handleComplaintEvent,
  handleDeliveryEvent,
  handleHardBounceEvent,
  handleOpenEvent,
  handleRejectEvent,
  handleSendEvent,
  handleSoftBounceEvent,
} from '@/helpers/logs-handling';
import {
  CreateTopicCommand,
  ListSubscriptionsCommand,
  SNSClient,
  SubscribeCommand,
} from '@aws-sdk/client-sns';
import type { ListSubscriptionsCommandOutput } from '@aws-sdk/client-sns';
import { logError, logInfo } from './logger';
import { DEFAULT_SES_REGION } from './ses';

export function createSNSServiceClient(
  accessKeyId: string,
  secretAccessKey: string,
  region?: string | null,
) {
  return new SNSClient({
    region: region || DEFAULT_SES_REGION,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export async function listSubscriptions(
  snsClient: SNSClient,
  nextToken?: string,
): Promise<ListSubscriptionsCommandOutput | undefined> {
  const command = new ListSubscriptionsCommand({
    NextToken: nextToken,
  });

  try {
    const result = await snsClient.send(command);
    return result;
  } catch (error) {
    logError(error, (error as Error)?.stack);
  }
}

export async function createTopic(
  snsClient: SNSClient,
  topicName: string,
): Promise<string | undefined> {
  const command = new CreateTopicCommand({
    Name: topicName,
  });

  try {
    const result = await snsClient.send(command);
    return result?.TopicArn;
  } catch (error) {
    logError(error, (error as Error)?.stack);
  }
}

type SubscribeToTopicParams = {
  topicArn: string;
  protocol?: 'https' | 'http';
  endpoint: string;
};

export async function subscribeToTopic(
  snsClient: SNSClient,
  params: SubscribeToTopicParams,
): Promise<string | undefined> {
  try {
    const { topicArn, endpoint, protocol = 'https' } = params;
    const command = new SubscribeCommand({
      TopicArn: topicArn,
      Endpoint: endpoint,
      Protocol: protocol,
      ReturnSubscriptionArn: true,
    });

    const result = await snsClient.send(command);
    return result?.SubscriptionArn;
  } catch (error) {
    logError(error, (error as Error)?.stack);
  }
}

export async function setupEmailFeedbackHandling(
  snsClient: SNSClient,
): Promise<string | null> {
  let feedbacksTopicArn: string | undefined;
  let feedbacksSubscriptionArn: string | undefined;

  // TODO: Remove me
  const APP_URL = 'https://dev.arikko.dev';
  const feedbacksEndpoint = `${APP_URL}/api/v1/webhook/feedbacks`;

  try {
    // 1. Check if bounces and complaints subscriptions already exist
    // for their respective topics
    const subscriptions = await listSubscriptions(snsClient);
    for (const subscription of subscriptions?.Subscriptions || []) {
      if (subscription.Endpoint === feedbacksEndpoint) {
        feedbacksTopicArn = subscription.TopicArn;
        feedbacksSubscriptionArn = subscription.SubscriptionArn;
      }
    }

    // 2. As the topic creation is idempotent, we can create the topics
    // and subscriptions even if they already exist
    feedbacksTopicArn = await createTopic(snsClient, 'feedbacks');

    // 3. If 'bounces' and 'complaints' SNS topics exist,
    // create SNS subscriptions for them
    if (feedbacksTopicArn !== '') {
      // Create 'bounces' and 'complaints' SNS subscriptions
      feedbacksSubscriptionArn = await subscribeToTopic(snsClient, {
        topicArn: feedbacksTopicArn!,
        endpoint: feedbacksEndpoint,
      });
    }

    if (!feedbacksTopicArn) {
      throw new Error('Failed to create SNS topics');
    }

    return feedbacksTopicArn;
  } catch (error) {
    logError(error, (error as Error)?.stack);
    return null;
  }
}

export interface SesNotificationType {
  // The Message property can be a plaintext string or a JSON string.
  Message: string;

  MessageId: string;
  Signature: string;
  SignatureVersion: string;
  SigningCertURL: string;
  Subject?: string; // The Subject can be optional as it may not always be present.
  Timestamp: string;
  Token?: string; // Token is optional and is used only when confirming subscriptions.
  TopicArn: string;
  Type: string;
  SubscribeURL?: string; // SubscribeURL is optional and is used only when confirming subscriptions.
  UnsubscribeURL: string;
}

export async function handleSubscriptionConfirmation(
  message: SesNotificationType,
): Promise<boolean> {
  const { SubscribeURL, UnsubscribeURL, Type } = message;
  try {
    logInfo('SNS Subscription Confirmation', message);
    if (Type === 'SubscriptionConfirmation') {
      // If the message is a subscription confirmation, call the subscribe
      // API to finish the subscription process.
      const response = await fetch(SubscribeURL!);
      return response?.status === 200;
    } else if (Type === 'UnsubscribeConfirmation') {
      // If the message is an unsubscribe confirmation, call the unsubscribe
      // API to finish the unsubscribe process.
      const response = await fetch(UnsubscribeURL);
      return response?.status === 200;
    } else {
      return false;
    }
  } catch (error) {
    logError(error, (error as Error)?.stack);
    return false;
  }
}

interface MailDetails {
  timestamp: string;
  source: string;
  sourceArn: string;
  sendingAccountId: string;
  messageId: string;
  destination: string[];
  headersTruncated: boolean;
  headers: {
    name: string;
    value: string;
  }[];
  commonHeaders: {
    from: string[];
    to: string[];
    messageId: string;
    subject: string;
  };
  tags: {
    [key: string]: string[];
  };
}

export interface SendEventNotification {
  eventType: 'Send';
  mail: MailDetails;
  send: {};
}

export interface DeliveryEventNotification {
  eventType: 'Delivery';
  mail: MailDetails;
  delivery: {
    timestamp: string;
    processingTimeMillis: number;
    recipients: string[];
    smtpResponse: string;
    reportingMTA: string;
  };
}

export interface BounceEventNotification {
  eventType: 'Bounce';
  bounce: {
    bounceType: 'Permanent' | 'Transient';
    bounceSubType: string;
    bouncedRecipients: {
      emailAddress: string;
      action: 'failed' | 'delayed';
      status: string;
      diagnosticCode: string;
    }[];
    timestamp: string;
    feedbackId: string;
    reportingMTA: string;
  };
  mail: MailDetails;
}

export interface ComplaintEventNotification {
  eventType: 'Complaint';
  complaint: {
    feedbackId: string;
    complaintSubType: string;
    complainedRecipients: {
      emailAddress: string;
    }[];
    timestamp: string;
    userAgent: string;
    complaintFeedbackType: string;
    arrivalDate: string;
  };
  mail: MailDetails;
}

export interface OpenEventNotification {
  eventType: 'Open';
  mail: MailDetails;
  open: {
    timestamp: string;
    userAgent: string;
    ipAddress: string;
  };
}

export interface ClickEventNotification {
  eventType: 'Click';
  mail: MailDetails;
  click: {
    timestamp: string;
    userAgent: string;
    ipAddress: string;
    link: string;
    linkTags: Record<string, string>;
  };
}

export interface RejectEventNotification {
  eventType: 'Reject';
  mail: MailDetails;
  reject: {
    reason: string;
  };
}

export async function handleEmailFeedbacks(
  notification: SesNotificationType,
): Promise<boolean> {
  try {
    const event:
      | SendEventNotification
      | DeliveryEventNotification
      | BounceEventNotification
      | ComplaintEventNotification
      | OpenEventNotification
      | ClickEventNotification
      | RejectEventNotification = JSON.parse(notification.Message);

    if (
      !['Bounce', 'Complaint', 'Delivery', 'Send', 'Open', 'Click'].includes(
        event.eventType,
      )
    ) {
      return false;
    }

    const { mail } = event;
    const { messageId, destination } = mail;

    // The destination array contains the email address that the message was sent to.
    // In our case, we only send to one email address at a time, so we can just
    // use the first element in the array.
    if (event.eventType === 'Send') {
      const sendEmail = destination[0];

      await handleSendEvent(messageId, sendEmail, mail.timestamp, event.send);
    } else if (event.eventType === 'Delivery') {
      const recipient = event.delivery.recipients[0];

      await handleDeliveryEvent(
        messageId,
        recipient,
        event.delivery.timestamp,
        event.delivery,
      );
    } else if (event.eventType === 'Bounce') {
      const { bounceType, bounceSubType } = event.bounce;

      if (
        bounceType === 'Permanent' &&
        [
          'General',
          'NoEmail',
          'Suppressed',
          'OnAccountSuppressionList',
        ].includes(bounceSubType)
      ) {
        const recipient = event.bounce.bouncedRecipients[0].emailAddress;
        await handleHardBounceEvent(
          messageId,
          recipient,
          event.bounce.timestamp,
          event.bounce,
        );
      } else if (bounceType === 'Transient') {
        const recipient = event.bounce.bouncedRecipients[0].emailAddress;
        await handleSoftBounceEvent(
          messageId,
          recipient,
          event.bounce.timestamp,
          event.bounce,
        );
      }
    } else if (event.eventType === 'Complaint') {
      const recipient = event.complaint.complainedRecipients[0].emailAddress;
      await handleComplaintEvent(
        messageId,
        recipient,
        event.complaint.timestamp,
        event.complaint,
      );
    } else if (event.eventType === 'Open') {
      const recipient = event.mail.destination[0];
      await handleOpenEvent(
        messageId,
        recipient,
        event.open.timestamp,
        event.open,
      );
    } else if (event.eventType === 'Click') {
      const recipient = event.mail.destination[0];
      await handleClickEvent(
        messageId,
        recipient,
        event.click.timestamp,
        event.click,
      );
    } else if (event.eventType === 'Reject') {
      const recipient = event.mail.destination[0];
      await handleRejectEvent(
        messageId,
        recipient,
        event.mail.timestamp,
        event.reject,
      );
    }

    return true;
  } catch (error) {
    logError(error, (error as Error)?.stack);
    return false;
  }
}
