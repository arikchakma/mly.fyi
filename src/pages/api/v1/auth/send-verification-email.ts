import { db } from '@/db';
import { users } from '@/db/schema';
import {
  type HandleRoute,
  type RouteParams,
  type ValidateRoute,
  handler,
} from '@/lib/handler';
import { HttpError } from '@/lib/http-error';
import { json } from '@/lib/response';
import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import Joi from 'joi';

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
  // TODO: Send verification email
  console.log('-'.repeat(20));
  console.log('Verification Code: ', verificationCode);
  console.log('-'.repeat(20));

  return json<SendVerificationEmailResponse>({ status: 'ok' });
}

export const POST: APIRoute = handler(
  handle satisfies HandleRoute<SendVerificationEmailRequest>,
  validate satisfies ValidateRoute<SendVerificationEmailRequest>,
);
