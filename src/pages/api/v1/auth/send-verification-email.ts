import { db } from '@/db';
import { users } from '@/db/schema';
import { sendVerificationEmail } from '@/lib/auth-email';
import {
  type HandleRoute,
  type RouteParams,
  type ValidateRoute,
  handler,
} from '@/lib/handler';
import { HttpError } from '@/lib/http-error';
import { rateLimitMiddleware } from '@/lib/rate-limit';
import { json, jsonWithRateLimit } from '@/lib/response';
import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import Joi from 'joi';
import { v4 as uuidV4 } from 'uuid';

export interface SendVerificationEmailResponse {
  status: 'ok';
}

export type SendVerificationEmailBody = {
  email: string;
};

export interface SendVerificationEmailRequest
  extends RouteParams<SendVerificationEmailBody> {}

async function validate(params: SendVerificationEmailRequest) {
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
      verificationCodeAt: true,
    },
  });

  if (!associatedUser) {
    throw new HttpError(
      'not_found',
      'No user associated with this email address',
    );
  }

  if (associatedUser.verifiedAt || !associatedUser.verificationCode) {
    throw new HttpError(
      'bad_request',
      'This email address is already verified',
    );
  }

  if (associatedUser?.verificationCodeAt) {
    const verificationCodeAt = new Date(associatedUser.verificationCodeAt);
    const now = new Date();
    const diff = now.getTime() - verificationCodeAt.getTime();

    // Wait 3 minutes before sending another verification email
    if (diff < 3 * 60 * 1000) {
      throw new HttpError('bad_request', 'Please wait before requesting again');
    }
  }

  return {
    ...params,
    body: value,
  };
}

async function handle({ body, context }: SendVerificationEmailRequest) {
  const { email } = body;

  const associatedUser = await db.query.users.findFirst({
    where: eq(users.email, email),
    columns: {
      id: true,
    },
  });

  const newVerificationCode = uuidV4();
  await db
    .update(users)
    .set({
      verificationCode: newVerificationCode,
      verificationCodeAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, associatedUser?.id!));

  await sendVerificationEmail(email, newVerificationCode!);

  return jsonWithRateLimit(
    json<SendVerificationEmailResponse>({ status: 'ok' }),
    context,
  );
}

export const POST: APIRoute = handler(
  handle satisfies HandleRoute<SendVerificationEmailRequest>,
  validate satisfies ValidateRoute<SendVerificationEmailRequest>,
  [rateLimitMiddleware()],
);
