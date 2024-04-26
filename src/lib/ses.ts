import { sleep } from '@/helpers/promise';
import {
  GetSendQuotaCommand,
  ListIdentitiesCommand,
  SESClient,
  SESServiceException,
} from '@aws-sdk/client-ses';
import { HttpError } from './http-error';
import { logError } from './logger';
import { connectRedis } from './redis';

export function createSESServiceClient(
  accessKeyId: string,
  secretAccessKey: string,
  region: string,
) {
  return new SESClient({
    region,
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

export const ALREADY_SEND_PER_SECOND_COUNT =
  'ses:already_send_per_second_count';

export async function increaseAlreadySendPerSecondCount() {
  const redisClient = await connectRedis();
  await redisClient.incr(ALREADY_SEND_PER_SECOND_COUNT);
}

export async function requireSESSendingRateLimit(client: SESClient) {
  const quota = await getSESSendQuota(client);
  if (!quota) {
    throw new HttpError('internal_error', 'Failed to get SES quota');
  }

  const redisClient = await connectRedis();

  const alreadySendPerSecondExists = await redisClient.exists(
    ALREADY_SEND_PER_SECOND_COUNT,
  );
  const alreadySendPerSecond = parseInt(
    (await redisClient.get(ALREADY_SEND_PER_SECOND_COUNT)) || '0',
    10,
  );

  if (
    !alreadySendPerSecondExists ||
    (alreadySendPerSecond && alreadySendPerSecond >= quota.maxSendRate)
  ) {
    await sleep(1000);
    await redisClient.set(ALREADY_SEND_PER_SECOND_COUNT, 0);
  }
}
