import type { APIContext, APIRoute } from 'astro';
import Joi from 'joi';
import {
  renderHttpError,
  renderInternalError,
  renderRateLimitError,
  renderValidationError,
} from './error';
import { HttpError, RateLimitError } from './http-error';

export type RouteParams<
  B = any,
  Q = any,
  P extends Record<string, string | undefined> = any,
> = {
  body: B;
  query: Q;
  headers: Headers;
  context: APIContext<any, P>;
};

export type HandleRoute<P = RouteParams> = (params: P) => Promise<Response>;
export type ValidateRoute<P = RouteParams> = (params: P) => Promise<P>;
export type MiddlewareRoute<P = RouteParams> = (params: P) => Promise<P>;

/**
 * Wraps the API handlers for error handling and other common tasks
 *
 * @param handler Handler to execute against the request
 *
 * @returns APIRoute
 */
export function handler(
  handle: HandleRoute,
  validate: ValidateRoute | undefined = undefined,
  middlewares: MiddlewareRoute[] = [],
): APIRoute {
  return async (context: APIContext): Promise<Response> => {
    try {
      const { request, url } = context;
      const queryParams = Object.fromEntries(url.searchParams);
      const body = await request.json().catch(() => ({}));

      let routeParams: RouteParams = {
        query: queryParams,
        body,
        headers: request.headers,
        context,
      };

      for (const middleware of middlewares) {
        routeParams = await middleware(routeParams);
      }

      if (validate) {
        routeParams = await validate(routeParams);
      }

      const handleResponse = await handle(routeParams);
      return handleResponse;
    } catch (e) {
      if (e instanceof Joi.ValidationError) {
        return renderValidationError(e);
      }

      if (HttpError.isHttpError(e)) {
        return renderHttpError(e);
      }

      if (RateLimitError.isRateLimitError(e)) {
        return renderRateLimitError(e);
      }

      return renderInternalError(e as Error);
    }
  };
}
