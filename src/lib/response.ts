import type { APIContext } from 'astro';

/**
 * Render a response with a JSON body
 *
 * @param response Object to be stringified
 * @param options Response options
 *
 * @returns Response
 */
export function json<T>(
  response: T,
  options: ResponseInit = {},
  context?: APIContext | undefined,
): Response {
  const rateLimit = context?.locals?.rateLimit;

  return new Response(JSON.stringify(response), {
    status: options.status || 200,
    headers: {
      'content-type': 'application/json',
      ...(rateLimit
        ? {
            'RateLimit-Limit': String(rateLimit.limit || 0),
            'RateLimit-Remaining': String(rateLimit.remaining || 0),
          }
        : {}),
      ...options.headers,
    },
  });
}
