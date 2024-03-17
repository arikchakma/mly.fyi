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

  return {
    ...params,
    body: value,
  };
}

async function handle({ body }: SendVerificationEmailRequest) {
  const { email } = body;

  const associatedUser = await db.query.users.findFirst({
    where: eq(users.email, email),
    columns: {
      id: true,
      verificationCode: true,
    },
  });

  const verificationCode = associatedUser?.verificationCode;
  console.log('-'.repeat(20));
  console.log(`Verification Code for ${email}: ${verificationCode}`);
  console.log('-'.repeat(20));
  // Send verification email

  return json<SendVerificationEmailResponse>({ status: 'ok' });
}

export const POST: APIRoute = handler(
  handle satisfies HandleRoute<SendVerificationEmailRequest>,
  validate satisfies ValidateRoute<SendVerificationEmailRequest>,
);
