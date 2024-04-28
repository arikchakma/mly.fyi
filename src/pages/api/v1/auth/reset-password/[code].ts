import { db } from '@/db';
import { users } from '@/db/schema';
import {
  type HandleRoute,
  type RouteParams,
  type ValidateRoute,
  handler,
} from '@/lib/handler';
import { hashPassword } from '@/lib/hash';
import { HttpError } from '@/lib/http-error';
import { createToken } from '@/lib/jwt';
import { json } from '@/lib/response';
import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import Joi from 'joi';

export interface ResetPasswordResponse {
  token: string;
}

export type ResetPasswordBody = {
  newPassword: string;
  confirmPassword: string;
};

export type ResetPasswordParams = {
  code: string;
};

export interface ResetPasswordRequest
  extends RouteParams<ResetPasswordBody, any, ResetPasswordParams> {}

async function validate(params: ResetPasswordRequest) {
  const paramsSchema = Joi.object({
    code: Joi.string()
      .uuid({
        version: 'uuidv4',
      })
      .required(),
  });

  const { error: paramsError } = paramsSchema.validate(params.context.params, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (paramsError) {
    throw paramsError;
  }

  const schema = Joi.object({
    newPassword: Joi.string().trim().min(8).max(25).required(),
    confirmPassword: Joi.string()
      .trim()
      .min(8)
      .max(25)
      .valid(Joi.ref('newPassword')),
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

async function handle(params: ResetPasswordRequest) {
  const { code } = params.context.params;

  const associatedUser = await db.query.users.findFirst({
    where: eq(users.resetPasswordCode, code),
  });

  if (!associatedUser) {
    throw new HttpError('not_found', 'Invalid or expired reset code');
  }

  const { resetPasswordCodeAt } = associatedUser;
  if (!resetPasswordCodeAt) {
    throw new HttpError('bad_request', 'Invalid or expired reset code');
  }

  // Reset code is valid for 1 hour
  if (new Date(resetPasswordCodeAt).getTime() + 60 * 60 * 1000 < Date.now()) {
    throw new HttpError('bad_request', 'Invalid or expired reset code');
  }

  const { newPassword } = params.body;
  const hashedPassword = await hashPassword(newPassword);

  await db
    .update(users)
    .set({
      password: hashedPassword,
      resetPasswordCode: null,
      resetPasswordCodeAt: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, associatedUser.id));

  const token = await createToken({
    id: associatedUser.id,
    email: associatedUser.email,
  });

  return json<ResetPasswordResponse>({ token });
}

export const POST: APIRoute = handler(
  handle satisfies HandleRoute<ResetPasswordRequest>,
  validate satisfies ValidateRoute<ResetPasswordRequest>,
);
