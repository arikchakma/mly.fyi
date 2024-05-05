import { createClient } from 'redis';
import { serverConfig } from './config';
import { logError, logInfo, logWarning } from './logger';

export type RedisClient = ReturnType<typeof createClient>;

let cachedRedisClient: RedisClient | null = null;

export async function connectRedis(): Promise<RedisClient> {
  if (cachedRedisClient) {
    logInfo('[redis] using cached client');
    return cachedRedisClient;
  }

  cachedRedisClient = createClient({
    url: serverConfig.redis.url,
  });

  try {
    cachedRedisClient.on('ready', () => {
      logInfo('[redis] ready');
    });

    cachedRedisClient.on('error', (err: any) => {
      logError('[redis] error', err);
    });

    cachedRedisClient.on('reconnected', () => {
      logInfo('[redis] reconnected');
    });

    cachedRedisClient.on('reconnectFailed', () => {
      logError('[redis] reconnectFailed');
    });

    cachedRedisClient.on('disconnected', () => {
      logWarning('[redis] disconnected');
    });

    logInfo('[redis] connecting to redis');
    await cachedRedisClient.connect();
    logInfo('[redis] connected to redis');

    return cachedRedisClient;
  } catch (error) {
    logError('[redis] error connecting to redis', error);
    await cachedRedisClient.quit();
    cachedRedisClient = null;
    throw error;
  }
}
