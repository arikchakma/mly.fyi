import { serverConfig } from './config';
import type { MiddlewareRoute } from './handler';
import { RateLimitError } from './http-error';
import { logError, logInfo } from './logger';
import { connectRedis } from './redis';

const LIMIT_SCRIPT = `
local current
current = tonumber(redis.call("incr", KEYS[1]))
if current == 1 then
  redis.call("expire", KEYS[1], ARGV[1])
end
local ttl = redis.call("ttl", KEYS[1])
return {current, ttl}
`;

export interface RateLimitResponse {
  success: boolean;
  count: number;
  limit: number;
  remaining: number;
  reset: number;
}

export interface RateLimitOptions {
  requests: number;
  timeWindow: number;
  prefix?: string;
}

export async function rateLimit(
  identifier: string,
  options: RateLimitOptions,
): Promise<RateLimitResponse> {
  const { requests, timeWindow, prefix } = options;

  try {
    const cache = await connectRedis();
    identifier = prefix ? `${prefix}:${identifier}` : identifier;

    let [result, ttl] = (await cache.eval(LIMIT_SCRIPT, {
      keys: [identifier],
      arguments: [String(timeWindow)],
    })) as [number, number];
    result = typeof result === 'number' ? result : parseInt(result);

    const remaining = requests - result;

    return {
      success: remaining >= 0,
      limit: requests,
      remaining: Math.max(0, remaining),
      count: result,
      reset: ttl || 0,
    };
  } catch (error) {
    logError(error, (error as any)?.stack);
    return {
      success: false,
      limit: requests,
      remaining: 0,
      count: 0,
      reset: 0,
    };
  }
}

export const DEFAULT_RATE_LIMIT_REQUESTS = 150;
export const DEFAULT_RATE_LIMIT_TIME_WINDOW = 60; // 1 minute

export function rateLimitMiddleware(
  options?: Partial<RateLimitOptions>,
): MiddlewareRoute {
  return async (params) => {
    const { context } = params;
    const ipAddress =
      context.clientAddress ||
      context.request.headers.get('x-forwarded-for') ||
      context.request.headers.get('x-real-ip');

    const { success, remaining, limit, count, reset } = await rateLimit(
      ipAddress!,
      {
        requests: options?.requests || DEFAULT_RATE_LIMIT_REQUESTS,
        timeWindow: options?.timeWindow || DEFAULT_RATE_LIMIT_TIME_WINDOW, // 1 minute
        prefix: options?.prefix || 'mly-rate-limit',
      },
    );

    if (serverConfig.isDev) {
      logInfo('-- Rate Limit Middleware --');
      logInfo(
        `Rate limit: ${remaining}/${limit} for ${ipAddress}(count: ${count}). Reset in ${reset} seconds.`,
      );
      logInfo('-------------------------');
    }

    if (!success) {
      throw new RateLimitError(
        'Too many requests, please try again later.',
        limit,
        remaining,
        reset,
      );
    }

    context.locals.rateLimit = {
      success,
      remaining,
      limit,
      count,
      reset,
    };

    return params;
  };
}
