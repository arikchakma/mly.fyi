import { db } from '@/db';
import { users } from '@/db/schema';
import { sendForgotPasswordEmail } from '@/lib/auth-email';
import {
  type HandleRoute,
  type RouteParams,
  type ValidateRoute,
  handler,
} from '@/lib/handler';
import { HttpError } from '@/lib/http-error';
import { logError } from '@/lib/logger';
import { rateLimitMiddleware } from '@/lib/rate-limit';
import { json, jsonWithRateLimit } from '@/lib/response';
import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';

export interface ForgotPasswordResponse {
  status: 'ok';
}

export type ForgotPasswordBody = {
  email: string;
};

export interface ForgotPasswordRequest
  extends RouteParams<ForgotPasswordBody> {}

async function validate(params: ForgotPasswordRequest) {
  const schema = Joi.object({
    email: Joi.string().email().trim().lowercase().required(),
  });

  const { error, value } = schema.validate(params.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    throw error;
  }

  const associatedUser = await db.query.users.findFirst({
    where: eq(users.email, value.email),
    columns: {
      id: true,
      verifiedAt: true,
      verificationCode: true,
    },
  });

  if (!associatedUser) {
    throw new HttpError(
      'not_found',
      'No user associated with this email address',
    );
  }

  if (!associatedUser.verifiedAt) {
    throw new HttpError(
      'user_not_verified',
      'Please verify your email address before resetting your password',
    );
  }

  return {
    ...params,
    body: value,
  };
}

async function handle({ body, context }: ForgotPasswordRequest) {
  const { email } = body;

  const associatedUser = await db.query.users.findFirst({
    where: eq(users.email, email),
    columns: {
      id: true,
      resetPasswordCode: true,
      resetPasswordCodeAt: true,
    },
  });
  if (!associatedUser) {
    throw new HttpError(
      'not_found',
      'No user associated with this email address',
    );
  }

  const lastResetCodeSentAt = associatedUser?.resetPasswordCodeAt;
  // if last reset code was sent less than 3 minutes ago, don't send another one
  if (
    lastResetCodeSentAt &&
    new Date().getTime() - new Date(lastResetCodeSentAt).getTime() <
      3 * 60 * 1000
  ) {
    return json<ForgotPasswordResponse>({ status: 'ok' });
  }

  const resetCode = uuidv4();
  await db
    .update(users)
    .set({
      resetPasswordCode: resetCode,
      resetPasswordCodeAt: new Date(),
    })
    .where(eq(users.id, associatedUser.id));

  await sendForgotPasswordEmail(email, resetCode);

  return jsonWithRateLimit(
    json<ForgotPasswordResponse>({ status: 'ok' }),
    context,
  );
}

export const POST: APIRoute = handler(
  handle satisfies HandleRoute<ForgotPasswordRequest>,
  validate satisfies ValidateRoute<ForgotPasswordRequest>,
  [rateLimitMiddleware()],
);
