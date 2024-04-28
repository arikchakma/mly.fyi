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
import { newId } from '@/lib/new-id';
import { json } from '@/lib/response';
import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import Joi from 'joi';
import { v4 as uuidV4 } from 'uuid';

export interface RegisterResponse {
  status: 'ok';
}

export type RegisterBody = {
  name: string;
  email: string;
  password: string;
};
export interface RegisterRequest extends RouteParams<RegisterBody> {}

async function validate(params: RegisterRequest) {
  const schema = Joi.object({
    name: Joi.string().trim().min(3).max(255).required(),
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

  const alreadyExists = await db.query.users.findFirst({
    where: eq(users.email, value.email),
    columns: {
      id: true,
    },
  });

  if (alreadyExists) {
    throw new HttpError('conflict', 'User already exists');
  }

  return {
    ...params,
    body: value,
  };
}

async function handle({ body }: RegisterRequest) {
  const { name, email, password } = body;

  const verificationCode = uuidV4();
  const userId = newId('user');

  const hashedPassword = await hashPassword(password);
  await db.insert(users).values({
    id: userId,
    name,
    email,
    password: hashedPassword,
    verificationCode,
    authProvider: 'email',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Send verification email

  return json<RegisterResponse>({ status: 'ok' });
}

export const POST: APIRoute = handler(
  handle satisfies HandleRoute<RegisterRequest>,
  validate satisfies ValidateRoute<RegisterRequest>,
);
