import {
  GetIdentityVerificationAttributesCommand,
  GetSendQuotaCommand,
  ListIdentitiesCommand,
  SESClient,
  SetIdentityFeedbackForwardingEnabledCommand,
  SetIdentityNotificationTopicCommand,
  VerifyEmailIdentityCommand,
} from '@aws-sdk/client-ses';
import { logError } from './logger';
import { setupEmailNotificationHandling } from './notification';
import { serverConfig } from './config';
import type { AllowedProjectSetupStatus } from '@/db/schema/projects';

export const sesClient = new SESClient({
  region: serverConfig.ses.region,
  credentials: {
    accessKeyId: serverConfig.ses.accessKeyId,
    secretAccessKey: serverConfig.ses.secretAccessKey,
  },
});

export async function listIdentities(nextToken?: string) {
  try {
    // @TODO: Implement do while loop to get all identities
    const command = new ListIdentitiesCommand({
      NextToken: nextToken,
    });

    return await sesClient.send(command);
  } catch (err) {
    logError(err, (err as Error)?.stack);
    return null;
  }
}

export async function checkIsValidSESIdentity(identity: string) {
  const emailDomain = identity.split('@')[1];

  try {
    const identities = await listIdentities();
    const verifiedIdentities = identities?.Identities || [];

    if (verifiedIdentities.includes(identity)) {
      return true;
    } else if (verifiedIdentities.includes(emailDomain)) {
      return true;
    }

    return false;
  } catch (error) {
    logError(error, (error as Error)?.stack);
    return false;
  }
}

export async function getIdentityVerificationAttributes(identity: string) {
  try {
    const emailDomain = identity.split('@')[1];
    const command = new GetIdentityVerificationAttributesCommand({
      Identities: [identity, emailDomain],
    });

    const identityVerificationAttributes = await sesClient.send(command);

    const domainVerificationStatus =
      identityVerificationAttributes?.VerificationAttributes?.[emailDomain]
        ?.VerificationStatus;
    const emailVerificationStatus =
      identityVerificationAttributes?.VerificationAttributes?.[identity]
        ?.VerificationStatus;

    return {
      domainStatus: domainVerificationStatus,
      emailStatus: emailVerificationStatus,
    };
  } catch (err) {
    logError(err, (err as Error)?.stack);
    return null;
  }
}

export async function verifyEmailIdentity(identity: string) {
  try {
    const command = new VerifyEmailIdentityCommand({
      EmailAddress: identity,
    });

    await sesClient.send(command);
    return true;
  } catch (err) {
    logError(err, (err as Error)?.stack);
    return false;
  }
}

export async function verifyIdentityAndStatus(fromEmail: string) {
  let status: AllowedProjectSetupStatus = 'verification-pending';
  const isValidSESIdentity = await checkIsValidSESIdentity(fromEmail);

  if (isValidSESIdentity) {
    const { emailStatus, domainStatus } =
      (await getIdentityVerificationAttributes(fromEmail)) || {};
    if (emailStatus === 'Success' || domainStatus === 'Success') {
      status = 'completed';
    }
  } else {
    await verifyEmailIdentity(fromEmail);
  }

  await setupEmailNotificationHandling(fromEmail);
  return status;
}

type SetIdentityNotificationTopicCommandParams = {
  identity: string;
  notificationType: 'Bounce' | 'Complaint' | 'Delivery';
  topicArn: string;
};

export async function setIdentityNotificationTopic(
  params: SetIdentityNotificationTopicCommandParams,
) {
  try {
    const command = new SetIdentityNotificationTopicCommand({
      Identity: params.identity,
      NotificationType: params.notificationType,
      SnsTopic: params.topicArn,
    });

    await sesClient.send(command);
    return true;
  } catch (err) {
    logError(err, (err as Error)?.stack);
    return false;
  }
}

export async function setIdentityFeedbackForwardingEnabled(
  identity: string,
  enabled: boolean,
) {
  try {
    const command = new SetIdentityFeedbackForwardingEnabledCommand({
      Identity: identity,
      ForwardingEnabled: enabled,
    });

    await sesClient.send(command);
    return true;
  } catch (err) {
    logError(err, (err as Error).stack);
    return false;
  }
}

export async function getSESSendQuota(): Promise<{
  max24HourSend: number;
  maxSendRate: number;
  sentLast24Hours: number;
} | null> {
  try {
    const sendingQuotaCommand = new GetSendQuotaCommand({});
    const sendingQuotaResult = await sesClient.send(sendingQuotaCommand);

    return {
      max24HourSend: +(sendingQuotaResult?.Max24HourSend || 0),
      maxSendRate: +(sendingQuotaResult?.MaxSendRate || 0),
      sentLast24Hours: +(sendingQuotaResult?.SentLast24Hours || 0),
    };
  } catch (err) {
    logError(err, (err as Error).stack);
    return null;
  }
}
