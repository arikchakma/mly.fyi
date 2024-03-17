import {
  SNSClient,
  ListSubscriptionsCommand,
  CreateTopicCommand,
  SubscribeCommand,
} from '@aws-sdk/client-sns';
import type { ListSubscriptionsCommandOutput } from '@aws-sdk/client-sns';
import { logError, logInfo } from './logger';
import { serverConfig } from './config';
import {
  setIdentityFeedbackForwardingEnabled,
  setIdentityNotificationTopic,
} from './ses';

type SNSCredentials = {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
};

export function getSNSClient(sns: SNSCredentials): SNSClient {
  return new SNSClient({
    region: sns.region,
    credentials: {
      accessKeyId: sns.accessKeyId,
      secretAccessKey: sns.secretAccessKey,
    },
  });
}

export async function listSubscriptions(
  sns: SNSCredentials,
  nextToken?: string,
): Promise<ListSubscriptionsCommandOutput | undefined> {
  const client = getSNSClient(sns);
  const command = new ListSubscriptionsCommand({
    NextToken: nextToken,
  });

  try {
    const result = await client.send(command);
    return result;
  } catch (error) {
    logError(error, (error as Error)?.stack);
  }
}

export async function createTopic(
  sns: SNSCredentials,
  topicName: string,
): Promise<string | undefined> {
  const snsClient = getSNSClient(sns);
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
  sns: SNSCredentials,
  params: SubscribeToTopicParams,
): Promise<string | undefined> {
  const { topicArn, endpoint, protocol = 'https' } = params;

  const snsClient = getSNSClient(sns);
  const command = new SubscribeCommand({
    TopicArn: topicArn,
    Endpoint: endpoint,
    Protocol: protocol,
    ReturnSubscriptionArn: true,
  });

  try {
    const result = await snsClient.send(command);
    return result?.SubscriptionArn;
  } catch (error) {
    logError(error, (error as Error)?.stack);
  }
}

export async function setupEmailNotificationHandling(
  sns: SNSCredentials,
  email: string,
): Promise<boolean> {
  const emailDomain = email.split('@')[1];

  let bouncesTopicArn: string | undefined;
  let bouncesSubscriptionArn: string | undefined;
  let complaintsTopicArn: string | undefined;
  let complaintsSubscriptionArn: string | undefined;

  const bouncesEndoint = `${serverConfig.appUrl}/api/v1/webhook/bounces`;
  const complaintsEndpoint = `${serverConfig.appUrl}/api/v1/webhook/complaints`;

  try {
    // 1. Check if bounces and complaints subscriptions already exist
    // for their respective topics
    const subscriptions = await listSubscriptions(sns);
    for (const subscription of subscriptions?.Subscriptions || []) {
      if (subscription.Endpoint === bouncesEndoint) {
        bouncesTopicArn = subscription.TopicArn;
        bouncesSubscriptionArn = subscription.SubscriptionArn;
      } else if (subscription.Endpoint === complaintsEndpoint) {
        complaintsTopicArn = subscription.TopicArn;
        complaintsSubscriptionArn = subscription.SubscriptionArn;
      }
    }

    // 2. As the topic creation is idempotent, we can create the topics
    // and subscriptions even if they already exist
    bouncesTopicArn = await createTopic(sns, 'bounces');
    complaintsTopicArn = await createTopic(sns, 'complaints');

    // 3. If 'bounces' and 'complaints' SNS topics exist,
    // create SNS subscriptions for them
    if (bouncesTopicArn !== '' && complaintsTopicArn !== '') {
      // Create 'bounces' and 'complaints' SNS subscriptions
      bouncesSubscriptionArn = await subscribeToTopic(sns, {
        topicArn: bouncesTopicArn!,
        endpoint: bouncesEndoint,
      });
      complaintsSubscriptionArn = await subscribeToTopic(sns, {
        topicArn: complaintsTopicArn!,
        endpoint: complaintsEndpoint,
      });
    }

    if (!bouncesTopicArn || !complaintsTopicArn) {
      throw new Error('Failed to create SNS topics');
    }

    // Add the subscription ARNs to the user identity
    const results = await Promise.allSettled([
      setIdentityNotificationTopic(sns, {
        topicArn: bouncesTopicArn,
        identity: email,
        notificationType: 'Bounce',
      }),
      setIdentityNotificationTopic(sns, {
        topicArn: bouncesTopicArn,
        identity: emailDomain,
        notificationType: 'Bounce',
      }),
      setIdentityNotificationTopic(sns, {
        topicArn: complaintsTopicArn,
        identity: email,
        notificationType: 'Complaint',
      }),
      setIdentityNotificationTopic(sns, {
        topicArn: complaintsTopicArn,
        identity: emailDomain,
        notificationType: 'Complaint',
      }),
      setIdentityFeedbackForwardingEnabled(sns, email, false),
      setIdentityFeedbackForwardingEnabled(sns, emailDomain, false),
    ]);

    for (const result of results) {
      if (result.status === 'rejected') {
        logError(result.reason);
      }
    }

    return true;
  } catch (error) {
    logError(error, (error as Error)?.stack);
    return false;
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

interface SESBounceRecipient {
  emailAddress: string;
  action: string;
  status: string;
  diagnosticCode: string;
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

// Look at the following link for more information about the event structure:
// https://docs.aws.amazon.com/ses/latest/dg/event-publishing-retrieving-sns-contents.html
// https://docs.aws.amazon.com/ses/latest/dg/event-publishing-retrieving-sns-examples.html#event-publishing-retrieving-sns-bounce
export interface SESBounceEvent {
  notificationType: 'Bounce';
  bounce: {
    bounceType: 'Permanent' | 'Transient' | 'Undetermined';
    bounceSubType:
      | 'General'
      | 'NoEmail'
      | 'Suppressed'
      | 'MailboxFull'
      | 'MessageTooLarge'
      | 'ContentRejected'
      | 'OnAccountSuppressionList';
    bouncedRecipients: SESBounceRecipient[];
    timestamp: string;
    feedbackId: string;
    reportingMTA: string;
  };
  mail: MailDetails;
}

interface SESComplaintRecipient {
  emailAddress: string;
}

export interface SESComplaintEvent {
  notificationType: 'Complaint';
  complaint: {
    complainedRecipients: SESComplaintRecipient[];
    timestamp: string;
    feedbackId: string;
    userAgent: string;
    complaintFeedbackType: string;
    arrivalDate: string;
  };
  mail: MailDetails;
}

interface SESDeliveryRecipient {
  emailAddress: string;
}

export interface SESDeliveryEvent {
  notificationType: 'Delivery';
  delivery: {
    timestamp: string;
    processingTimeMillis: number;
    recipients: SESDeliveryRecipient[];
    smtpResponse: string;
    reportingMTA: string;
  };
  mail: MailDetails;
}

export async function handleNotification(
  notification: SesNotificationType,
): Promise<boolean> {
  try {
    const event: SESBounceEvent | SESComplaintEvent | SESDeliveryEvent =
      JSON.parse(notification.Message);

    if (!['Bounce', 'Complaint', 'Delivery'].includes(event.notificationType)) {
      return false;
    }

    const { mail } = event;
    const { messageId, destination } = mail;

    // The destination array contains the email address that the message was sent to.
    // In our case, we only send to one email address at a time, so we can just
    // use the first element in the array.
    const sendEmail = destination[0] || '';

    if (event.notificationType === 'Bounce') {
      const { bounceType, bounceSubType } = (event as SESBounceEvent).bounce;

      // Handle hard bounces
      if (
        bounceType === 'Permanent' &&
        [
          'General',
          'NoEmail',
          'Suppressed',
          'OnAccountSuppressionList',
        ].includes(bounceSubType)
      ) {
        // TODO: Implement handle hard bounce
      }
      // Handle soft bounces
      // https://repost.aws/knowledge-center/ses-understand-soft-bounces
      else if (
        bounceType === 'Transient' &&
        [
          'General',
          'MailboxFull',
          'MessageTooLarge',
          'ContentRejected',
          'AttachmentRejected',
        ].includes(bounceSubType)
      ) {
        // TODO: Implement handle soft bounce
      } else if (bounceType === 'Permanent') {
        // TODO: Implement handle hard bounce
      } else {
        // TODO: Implement handle soft bounce

        logInfo('Unhandled bounce type or subtype', bounceType, bounceSubType);
      }

      // Handle Complaints
    } else if (event.notificationType === 'Complaint') {
      // TODO: Implement handle complaints
    } else if (event.notificationType === 'Delivery') {
      // TODO: Implement handle deliveries
    }

    return true;
  } catch (error) {
    logError(error, (error as Error)?.stack);
    return false;
  }
}
