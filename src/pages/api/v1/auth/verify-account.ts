import type { APIRoute } from 'astro';
import {
  handler,
  type HandleRoute,
  type RouteParams,
  type ValidateRoute,
} from '@/lib/handler';
import { json } from '@/lib/response';
import Joi from 'joi';
import { db } from '@/db';
import { eq } from 'drizzle-orm';
import { users } from '@/db/schema';
import { HttpError } from '@/lib/http-error';
import { createToken } from '@/lib/jwt';

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

async function handle({ body }: SendVerificationEmailRequest) {
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

  await db
    .update(users)
    .set({
      verifiedAt: new Date(),
      verificationCode: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, associatedUser.id));

  const token = await createToken({
    id: associatedUser.id,
    email: associatedUser.email,
  });

  return json<SendVerificationEmailResponse>({ token });
}

export const POST: APIRoute = handler(
  handle satisfies HandleRoute<SendVerificationEmailRequest>,
  validate satisfies ValidateRoute<SendVerificationEmailRequest>,
);
