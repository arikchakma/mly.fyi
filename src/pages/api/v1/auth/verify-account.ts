import { db } from '@/db';
import { users } from '@/db/schema';
import {
  type HandleRoute,
  type RouteParams,
  type ValidateRoute,
  handler,
} from '@/lib/handler';
import { HttpError } from '@/lib/http-error';
import { createToken } from '@/lib/jwt';
import { rateLimitMiddleware } from '@/lib/rate-limit';
import { json, jsonWithRateLimit } from '@/lib/response';
import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import Joi from 'joi';

export interface SendVerificationEmailResponse {
  token: string;
}

export type SendVerificationEmailBody = {
  code: string;
};

export interface SendVerificationEmailRequest
  extends RouteParams<SendVerificationEmailBody> {}

async function validate(params: SendVerificationEmailRequest) {
  const schema = Joi.object({
    code: Joi.string().required(),
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

async function handle({ body, context }: SendVerificationEmailRequest) {
  const { code } = body;

  const associatedUser = await db.query.users.findFirst({
    where: eq(users.verificationCode, code),
  });

  if (!associatedUser) {
    throw new HttpError(
      'not_found',
      'No user associated with this verification code',
    );
  }

  if (associatedUser.verifiedAt) {
    throw new HttpError('bad_request', 'User is already verified');
  }

  const { verificationCodeAt } = associatedUser;
  if (!verificationCodeAt) {
    throw new HttpError('bad_request', 'Invalid verification code');
  }

  // Verification code expires after 24 hours
  if (
    new Date(verificationCodeAt).getTime() + 24 * 60 * 60 * 1000 <
    Date.now()
  ) {
    throw new HttpError('bad_request', 'Verification code expired');
  }

  await db
    .update(users)
    .set({
      verifiedAt: new Date(),
      verificationCode: null,
      verificationCodeAt: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, associatedUser.id));

  const token = await createToken({
    id: associatedUser.id,
    email: associatedUser.email,
  });

  return jsonWithRateLimit(
    json<SendVerificationEmailResponse>({ token }),
    context,
  );
}

export const POST: APIRoute = handler(
  handle satisfies HandleRoute<SendVerificationEmailRequest>,
  validate satisfies ValidateRoute<SendVerificationEmailRequest>,
  [rateLimitMiddleware()],
);
