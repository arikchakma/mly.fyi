import type { APIRoute } from 'astro';
import {
  handler,
  type HandleRoute,
  type RouteParams,
  type ValidateRoute,
} from '@/lib/handler';
import { json } from '@/lib/response';
import Joi from 'joi';
import { eq } from 'drizzle-orm';
import { users } from '@/db/schema';
import { db } from '@/db';
import { HttpError } from '@/lib/http-error';
import { verifyPassword } from '@/lib/hash';
import { createToken } from '@/lib/jwt';

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
    password: Joi.string().trim().min(8).required(),
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

async function handle({ body }: V1LoginRequest) {
  const { email, password } = body;

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
    throw new HttpError('bad_request', 'User is not verified');
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
