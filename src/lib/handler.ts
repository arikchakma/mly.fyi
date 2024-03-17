import type { APIContext, APIRoute } from 'astro';
import Joi from 'joi';
import {
  renderHttpError,
  renderInternalError,
  renderValidationError,
} from './error';
import { HttpError } from './http-error';

export type RouteParams<B = any, Q = any> = {
  query: Q;
  body: B;
  headers: Headers;
  context: APIContext;
};

export type HandleRoute<P = RouteParams> = (params: P) => Promise<Response>;
export type ValidateRoute<P = RouteParams> = (params: P) => Promise<P>;

export type HandlerOptions = {};

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
  options: HandlerOptions = {},
): APIRoute {
  return async (context: APIContext): Promise<Response> => {
    try {
      const { request, params: queryParams } = context;
      const body = await request.json();

      let routeParams: RouteParams = {
        query: queryParams,
        body,
        headers: request.headers,
        context,
      };

      if (validate) {
        routeParams = await validate(routeParams);
      }

      return handle(routeParams);
    } catch (e) {
      if (e instanceof Joi.ValidationError) {
        return renderValidationError(e);
      }

      if (HttpError.isHttpError(e)) {
        return renderHttpError(e);
      }

      return renderInternalError(e as Error);
    }
  };
}
