import { type HandleRoute, type RouteParams, handler } from '@/lib/handler';
import { rateLimitMiddleware } from '@/lib/rate-limit';
import { connectRedis } from '@/lib/redis';
import { json, jsonWithRateLimit } from '@/lib/response';
import type { APIRoute } from 'astro';

export interface HealthRequest extends RouteParams {}

export type HealthResponse = {
  status: 'ok';
  redis: boolean;
};

async function handle(params: HealthRequest) {
  const redisClient = await connectRedis();
  const redisPong = await redisClient.ping();

  const isRedisConnected = redisPong === 'PONG';
  const status = isRedisConnected ? 200 : 500;

  return jsonWithRateLimit(
    json<HealthResponse>(
      { status: 'ok', redis: isRedisConnected },
      {
        status,
      },
    ),
    params.context,
  );
}

export const GET: APIRoute = handler(
  handle satisfies HandleRoute<HealthRequest>,
  undefined,
  [
    rateLimitMiddleware({
      requests: 5,
      timeWindow: 10,
    }),
  ],
);
