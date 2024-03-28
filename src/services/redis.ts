import { createClient } from 'redis';
import { serverConfig } from '../lib/config';
import { logError, logInfo, logWarning } from '../lib/logger';

export const redisClient = createClient({
  url: serverConfig.redis.url,
});

redisClient.on('connecting', () => {
  logInfo('[redis] connecting');
});

redisClient.on('connect', () => {
  logInfo('[redis] connected');
});

redisClient.on('ready', () => {
  logInfo('[redis] ready');
});

redisClient.on('error', (err: any) => {
  logError('[redis] error', err);
});

redisClient.on('reconnected', () => {
  logInfo('[redis] reconnected');
});

redisClient.on('reconnectFailed', () => {
  logError('[redis] reconnectFailed');
});

redisClient.on('disconnected', () => {
  logWarning('[redis] disconnected');
});

export function connectRedis() {
  return redisClient.connect();
}
