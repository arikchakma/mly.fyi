import {
  SNSClient,
  ListSubscriptionsCommand,
  CreateTopicCommand,
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

// ----------------------------------------------------------
// TODO: Uncomment this while implementing feedback handling
// ----------------------------------------------------------
// interface SESBounceRecipient {
//   emailAddress: string;
//   action: string;
//   status: string;
//   diagnosticCode: string;
// }

// interface MailDetails {
//   timestamp: string;
//   source: string;
//   sourceArn: string;
//   sendingAccountId: string;
//   messageId: string;
//   destination: string[];
//   headersTruncated: boolean;
//   headers: {
//     name: string;
//     value: string;
//   }[];
//   commonHeaders: {
//     from: string[];
//     to: string[];
//     messageId: string;
//     subject: string;
//   };
//   tags: {
//     [key: string]: string[];
//   };
// }

// // Look at the following link for more information about the event structure:
// // https://docs.aws.amazon.com/ses/latest/dg/event-publishing-retrieving-sns-contents.html
// // https://docs.aws.amazon.com/ses/latest/dg/event-publishing-retrieving-sns-examples.html#event-publishing-retrieving-sns-bounce
// export interface SESBounceEvent {
//   notificationType: 'Bounce';
//   bounce: {
//     bounceType: 'Permanent' | 'Transient' | 'Undetermined';
//     bounceSubType:
//       | 'General'
//       | 'NoEmail'
//       | 'Suppressed'
//       | 'MailboxFull'
//       | 'MessageTooLarge'
//       | 'ContentRejected'
//       | 'OnAccountSuppressionList';
//     bouncedRecipients: SESBounceRecipient[];
//     timestamp: string;
//     feedbackId: string;
//     reportingMTA: string;
//   };
//   mail: MailDetails;
// }

// interface SESComplaintRecipient {
//   emailAddress: string;
// }

// export interface SESComplaintEvent {
//   notificationType: 'Complaint';
//   complaint: {
//     complainedRecipients: SESComplaintRecipient[];
//     timestamp: string;
//     feedbackId: string;
//     userAgent: string;
//     complaintFeedbackType: string;
//     arrivalDate: string;
//   };
//   mail: MailDetails;
// }

// interface SESDeliveryRecipient {
//   emailAddress: string;
// }

// export interface SESDeliveryEvent {
//   notificationType: 'Delivery';
//   delivery: {
//     timestamp: string;
//     processingTimeMillis: number;
//     recipients: SESDeliveryRecipient[];
//     smtpResponse: string;
//     reportingMTA: string;
//   };
//   mail: MailDetails;
// }

// export async function handleNotification(
//   notification: SesNotificationType,
// ): Promise<boolean> {
//   try {
//     const event: SESBounceEvent | SESComplaintEvent | SESDeliveryEvent =
//       JSON.parse(notification.Message);

//     if (!['Bounce', 'Complaint', 'Delivery'].includes(event.notificationType)) {
//       return false;
//     }

//     const { mail } = event;
//     const { messageId, destination } = mail;

//     // The destination array contains the email address that the message was sent to.
//     // In our case, we only send to one email address at a time, so we can just
//     // use the first element in the array.
//     const sendEmail = destination[0] || '';

//     if (event.notificationType === 'Bounce') {
//       const { bounceType, bounceSubType } = (event as SESBounceEvent).bounce;

//       // Handle hard bounces
//       if (
//         bounceType === 'Permanent' &&
//         [
//           'General',
//           'NoEmail',
//           'Suppressed',
//           'OnAccountSuppressionList',
//         ].includes(bounceSubType)
//       ) {
//         // TODO: Implement handle hard bounce
//       }
//       // Handle soft bounces
//       // https://repost.aws/knowledge-center/ses-understand-soft-bounces
//       else if (
//         bounceType === 'Transient' &&
//         [
//           'General',
//           'MailboxFull',
//           'MessageTooLarge',
//           'ContentRejected',
//           'AttachmentRejected',
//         ].includes(bounceSubType)
//       ) {
//         // TODO: Implement handle soft bounce
//       } else if (bounceType === 'Permanent') {
//         // TODO: Implement handle hard bounce
//       } else {
//         logInfo('Unhandled bounce type or subtype', bounceType, bounceSubType);
//       }

//       // Handle Complaints
//     } else if (event.notificationType === 'Complaint') {
//       // TODO: Implement handle complaints
//     } else if (event.notificationType === 'Delivery') {
//       // TODO: Implement handle deliveries
//     }

//     return true;
//   } catch (error) {
//     logError(error, (error as Error)?.stack);
//     return false;
//   }
// }
