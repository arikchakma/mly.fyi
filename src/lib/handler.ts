import type { APIContext, APIRoute } from 'astro';
import Joi from 'joi';
import { renderInternalError, renderValidationError } from './error';

export interface RouteParams {
  query: any;
  body: any;
  headers: Headers;
  context: APIContext;
}

export type HandleRoute<P = RouteParams> = (params: P) => Promise<Response>;
export type ValidateRoute<P = RouteParams> = (params: P) => Promise<P>;

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
): APIRoute {
  return async (context: APIContext): Promise<Response> => {
    try {
      const { request, params: queryParams } = context;
      const body = Object.fromEntries(await request.formData());

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

      return renderInternalError(e as Error);
    }
  };
}
