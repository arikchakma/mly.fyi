import { logError } from './logger';
import { connectRedis } from './redis';

const SCRIPT = `
local current
current = tonumber(redis.call("incr", KEYS[1]))
if current == 1 then
  redis.call("expire", KEYS[1], ARGV[1])
end
return current
`;

export interface RateLimitResponse {
  success: boolean;
  limit: number;
  remaining: number;
}

export async function rateLimit(
  identifier: string,
  options: {
    requests: number;
    timeWindow: number; // in seconds
    prefix?: string;
  } = {
    requests: 10,
    timeWindow: 60,
    prefix: 'rate-limit',
  },
): Promise<RateLimitResponse> {
  const { requests, timeWindow, prefix } = options;

  try {
    const cache = await connectRedis();
    identifier = prefix ? `${prefix}:${identifier}` : identifier;

    let result = (await cache.eval(SCRIPT, {
      keys: [identifier],
      arguments: [String(timeWindow)],
    })) as number;
    result = typeof result === 'number' ? result : parseInt(result);

    const remaining = requests - result;

    return {
      success: remaining >= 0,
      limit: requests,
      remaining: Math.max(0, remaining),
    };
  } catch (error) {
    logError(error, (error as any)?.stack);
    return {
      success: false,
      limit: requests,
      remaining: 0,
    };
  }
}
