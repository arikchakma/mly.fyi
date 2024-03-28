import {
  GetSendQuotaCommand,
  ListIdentitiesCommand,
  SESClient,
  SESServiceException,
} from '@aws-sdk/client-ses';
import { HttpError } from './http-error';
import { logError } from './logger';

export const DEFAULT_SES_REGION = 'ap-south-1';

export function createSESServiceClient(
  accessKeyId: string,
  secretAccessKey: string,
  region?: string | null,
) {
  return new SESClient({
    region: region || DEFAULT_SES_REGION,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export async function isValidConfiguration(client: SESClient) {
  try {
    const command = new GetSendQuotaCommand({});
    await client.send(command);
    return true;
  } catch (err) {
    logError(err, (err as Error)?.stack);
    if (err instanceof SESServiceException) {
      if (err.name === 'InvalidClientTokenId') {
        throw new HttpError('bad_request', 'Invalid credentials');
      } else if (err.name === 'SignatureDoesNotMatch') {
        throw new HttpError('bad_request', 'Invalid credentials');
      }
    }
    return false;
  }
}

export async function listIdentities(client: SESClient) {
  try {
    const identities = new Set<string>();
    let nextToken: string | undefined;

    do {
      const command = new ListIdentitiesCommand({
        NextToken: nextToken,
      });

      const response = await client.send(command);
      if (response) {
        response?.Identities?.forEach((identity) => {
          identities.add(identity);
        });

        nextToken = response.NextToken;
      } else {
        nextToken = undefined;
      }
    } while (nextToken);

    return identities;
  } catch (err) {
    logError(err, (err as Error)?.stack);
    return null;
  }
}

export async function getSESSendQuota(client: SESClient): Promise<{
  max24HourSend: number;
  maxSendRate: number;
  sentLast24Hours: number;
} | null> {
  try {
    const sendingQuotaCommand = new GetSendQuotaCommand({});
    const sendingQuotaResult = await client.send(sendingQuotaCommand);

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
