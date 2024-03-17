import type { APIRoute } from 'astro';
import {
  handler,
  type HandleRoute,
  type RouteParams,
  type ValidateRoute,
} from '@/lib/handler';
import { json } from '@/lib/response';
import Joi from 'joi';

export interface V1LoginResponse {
  token: string;
}
export interface V1LoginRequest extends RouteParams {
  body: {
    email: string;
    password: string;
  };
}

async function validate(params: V1LoginRequest) {
  const schema = Joi.object({
    email: Joi.string().email().trim().lowercase().required(),
    password: Joi.string().trim().min(8).required(),
  });

  const { error, value } = schema.validate(
    {
      email: 'arik',
    },
    {
      abortEarly: false,
      stripUnknown: true,
    },
  );

  if (error) {
    throw error;
  }

  return {
    ...params,
    body: value,
  };
}

async function handle({ body, context }: V1LoginRequest) {
  // const { email, password } = body;
  // const user = await User.findOne({ email });
  // if (!user) {
  //   return renderUnauthorized();
  // }
  // const isValidPassword = await verifyPassword(password, user.password);
  // if (!isValidPassword) {
  //   return renderUnauthorized();
  // }
  // const token = await generateToken({
  //   email: user.email,
  //   id: user._id,
  // });
  // createTokenCookie(context, token);
  // return renderJSON({
  //   token,
  // } satisfies V1LoginResponse);

  return json<V1LoginResponse>({ token: '' });
}

export const POST: APIRoute = handler(
  handle satisfies HandleRoute<V1LoginRequest>,
  validate satisfies ValidateRoute<V1LoginRequest>,
);
