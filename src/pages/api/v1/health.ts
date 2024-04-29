import { connectRedis } from '@/lib/redis';

export async function GET() {
  const redisClient = await connectRedis();
  const redisPong = await redisClient.ping();

  const isRedisConnected = redisPong === 'PONG';
  const status = isRedisConnected ? 200 : 500;

  return new Response(
    JSON.stringify({
      status: 'ok',
      redis: isRedisConnected,
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );
}
