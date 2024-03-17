import {
  GetIdentityVerificationAttributesCommand,
  GetSendQuotaCommand,
  ListIdentitiesCommand,
  SESClient,
  SetIdentityFeedbackForwardingEnabledCommand,
  SetIdentityNotificationTopicCommand,
  VerificationStatus,
  VerifyEmailIdentityCommand,
} from '@aws-sdk/client-ses';
import { logError } from './logger';
import { setupEmailNotificationHandling } from './sns';
import { serverConfig } from './config';

export type SESCredentials = {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
};

export function getSESClient(
  credentials: SESCredentials,
  sesEndpointOverrideUrl?: string,
) {
  return new SESClient({
    region: credentials.region,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
    },
    ...(sesEndpointOverrideUrl
      ? {
          endpoint: sesEndpointOverrideUrl,
        }
      : {}),
  });
}

export async function listIdentities(ses: SESCredentials, nextToken?: string) {
  const sesClient = getSESClient(ses);

  // @TODO: Implement do while loop to get all identities
  const command = new ListIdentitiesCommand({
    NextToken: nextToken,
  });

  try {
    return await sesClient.send(command);
  } catch (err) {
    logError(err, (err as Error)?.stack);
    return null;
  }
}

export async function checkIsValidSESIdentity(
  ses: SESCredentials,
  identity: string,
) {
  const emailDomain = identity.split('@')[1];

  try {
    const identities = await listIdentities(ses);
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

export async function getIdentityVerificationAttributes(
  ses: SESCredentials,
  identity: string,
) {
  const emailDomain = identity.split('@')[1];
  const sesClient = getSESClient(ses);

  const command = new GetIdentityVerificationAttributesCommand({
    Identities: [identity, emailDomain],
  });

  try {
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

export async function verifyEmailIdentity(
  ses: SESCredentials,
  identity: string,
) {
  const sesClient = getSESClient(ses);

  const command = new VerifyEmailIdentityCommand({
    EmailAddress: identity,
  });

  try {
    await sesClient.send(command);
    return true;
  } catch (err) {
    logError(err, (err as Error)?.stack);
    return false;
  }
}

export type ProjectSetupStatus =
  | 'completed'
  | 'verification-pending'
  | 'not-started';

export async function verifyIdentityAndStatus(
  credentials: SESCredentials,
  projectId: string,
  fromEmail: string,
) {
  let status: ProjectSetupStatus = 'verification-pending';
  const isValidSESIdentity = await checkIsValidSESIdentity(
    credentials,
    fromEmail,
  );

  if (isValidSESIdentity) {
    const { emailStatus, domainStatus } =
      (await getIdentityVerificationAttributes(credentials, fromEmail)) || {};
    if (emailStatus === 'Success' || domainStatus === 'Success') {
      status = 'completed';
    }
  } else {
    await verifyEmailIdentity(credentials, fromEmail);
  }

  await setupEmailNotificationHandling(credentials, fromEmail);
  return status;
}

type SetIdentityNotificationTopicCommandParams = {
  identity: string;
  notificationType: 'Bounce' | 'Complaint' | 'Delivery';
  topicArn: string;
};

export async function setIdentityNotificationTopic(
  ses: SESCredentials,
  params: SetIdentityNotificationTopicCommandParams,
) {
  const sesClient = getSESClient(ses);

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
  ses: SESCredentials,
  identity: string,
  enabled: boolean,
) {
  const sesClient = getSESClient(ses);

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

export async function getSESSendQuota(ses: SESCredentials): Promise<{
  max24HourSend: number;
  maxSendRate: number;
  sentLast24Hours: number;
} | null> {
  const sesOverrideUrl = serverConfig.isDev
    ? serverConfig.ses.sesEndpointOverrideUrl
    : undefined;
  const sesClient = getSESClient(ses, sesOverrideUrl);

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
