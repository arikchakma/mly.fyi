import { db } from '@/db';
import { users } from '@/db/schema';
import { renderRateLimitError } from '@/lib/error';
import {
  type HandleRoute,
  type RouteParams,
  type ValidateRoute,
  handler,
} from '@/lib/handler';
import { verifyPassword } from '@/lib/hash';
import { HttpError } from '@/lib/http-error';
import { createToken } from '@/lib/jwt';
import { rateLimit } from '@/lib/rate-limit';
import { json } from '@/lib/response';
import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import Joi from 'joi';

export interface V1LoginResponse {
  token: string;
}

type LoginBody = {
  email: string;
  password: string;
};

export interface V1LoginRequest extends RouteParams<LoginBody> {}

async function validate(params: V1LoginRequest) {
  const schema = Joi.object({
    email: Joi.string().email().trim().lowercase().required(),
    password: Joi.string().trim().min(8).max(25).required(),
  });

  const { error, value } = schema.validate(params.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    throw error;
  }

  return {
    ...params,
    body: value,
  };
}

async function handle(params: V1LoginRequest) {
  const { body, context } = params;
  const { email, password } = body;

  // const ipAddress =
  //   context.clientAddress ||
  //   context.request.headers.get('x-forwarded-for') ||
  //   context.request.headers.get('x-real-ip');

  // const { success, remaining, limit } = await rateLimit(ipAddress!, {
  //   requests: 5,
  //   timeWindow: 1,
  //   prefix: 'request-login',
  // });

  // console.log('-'.repeat(20));
  // console.log('ipAddress:', ipAddress);
  // console.log('success:', success);
  // console.log('remaining:', remaining);
  // console.log('limit:', limit);
  // console.log('-'.repeat(20));
  // if (!success) {
  //   return renderRateLimitError(limit, remaining);
  // }

  const associatedUser = await db.query.users.findFirst({
    where: eq(users.email, email),
    columns: {
      id: true,
      email: true,
      password: true,
      verifiedAt: true,
      authProvider: true,
    },
  });

  if (!associatedUser) {
    throw new HttpError('bad_request', 'Invalid email or password');
  }

  const isValidPassword = await verifyPassword(
    password,
    associatedUser.password,
  );
  if (!isValidPassword) {
    throw new HttpError('bad_request', 'Invalid email or password');
  }

  if (associatedUser.authProvider !== 'email') {
    throw new HttpError(
      'bad_request',
      `Please login with ${associatedUser.authProvider}.`,
    );
  }

  if (!associatedUser.verifiedAt) {
    throw new HttpError('user_not_verified', 'User is not verified');
  }

  const token = await createToken({
    id: associatedUser.id,
    email: associatedUser.email,
  });

  return json<V1LoginResponse>({ token });
}

export const POST: APIRoute = handler(
  handle satisfies HandleRoute<V1LoginRequest>,
  validate satisfies ValidateRoute<V1LoginRequest>,
);
