import type { APIContext } from 'astro';
import type { RateLimitResponse } from './rate-limit';

/**
 * Render a response with a JSON body
 *
 * @param response Object to be stringified
 * @param options Response options
 *
 * @returns Response
 */
export function json<T>(response: T, options: ResponseInit = {}): Response {
  return new Response(JSON.stringify(response), {
    status: options.status || 200,
    headers: {
      'content-type': 'application/json',
      ...options.headers,
    },
  });
}

export function jsonWithRateLimit<T>(
  response: Response,
  context?: APIContext,
): Response {
  const rateLimit = context?.locals?.rateLimit;
  if (rateLimit) {
    response.headers.set('RateLimit-Limit', String(rateLimit.limit));
    response.headers.set('RateLimit-Remaining', String(rateLimit.remaining));
    response.headers.set('RateLimit-Reset', String(rateLimit.reset));
  }

  return response;
}
