import type { APIContext, APIRoute } from 'astro';
import Joi from 'joi';
import {
  renderHttpError,
  renderInternalError,
  renderValidationError,
} from './error';
import { HttpError } from './http-error';
import { decodeToken, readTokenCookie } from './jwt';
import type { User } from '@/db/types';
import { db } from '@/db';
import { eq } from 'drizzle-orm';
import { users } from '@/db/schema';

export type RouteParams<
  B = any,
  Q = any,
  P extends Record<string, string | undefined> = any,
> = {
  body: B;
  query: Q;
  headers: Headers;
  context: APIContext<any, P>;
  user?: User;
  userId?: string;
};

export type HandleRoute<P = RouteParams> = (params: P) => Promise<Response>;
export type ValidateRoute<P = RouteParams> = (params: P) => Promise<P>;

export type HandlerOptions = {
  isProtected?: boolean;
};

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
  const { isProtected = false } = options;

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

      if (isProtected) {
        const token = readTokenCookie(context);
        if (!token) {
          throw new HttpError('unauthorized', 'Unauthorized');
        }

        const payload = decodeToken(token);
        const user = await db.query.users.findFirst({
          where: eq(users.id, payload.id),
        });

        if (!user) {
          throw new HttpError('unauthorized', 'Unauthorized');
        }

        if (!user.isEnabled) {
          throw new HttpError('bad_request', 'User not verified');
        }

        Object.assign(routeParams, {
          user,
          userId: user.id,
        });
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

      return renderInternalError(e as Error);
    }
  };
}
