import type { APIRoute } from 'astro';
import {
  handler,
  type HandleRoute,
  type RouteParams,
  type ValidateRoute,
} from '@/lib/handler';
import { json } from '@/lib/response';
import Joi from 'joi';
import { authenticateApiKey } from '@/lib/authenticate-api-key';
import { db } from '@/db';
import { HttpError } from '@/lib/http-error';

export interface SendEmailResponse {}

type RequireAtLeastOne<T> = {
  [K in keyof T]-?: Required<Pick<T, K>> &
    Partial<Pick<T, Exclude<keyof T, K>>>;
}[keyof T];

interface EmailRenderOptions {
  /**
   * The plain text content of the email.
   */
  text?: string;

  /**
   * The HTML content of the email.
   */
  html?: string;
}

interface EmailOptions extends EmailRenderOptions {
  /**
   * The email address that appears as the sender of the email.
   * Use a friendly name and a valid email address.
   *
   * Example: `John Doe <johndoe@example.com>`
   */
  from: string;

  /**
   * The recipient(s) of the email. Can be a single email address or an array of email addresses.
   */
  to: string;

  /**
   * The email address that should be used for replies. If not provided, replies will go to the 'from' address.
   */
  replyTo?: string;

  /**
   * The subject line of the email.
   */
  subject: string;

  /**
   * Additional headers to include in the email.
   */
  headers?: Record<string, string>;
}

export type SendEmailBody = RequireAtLeastOne<EmailRenderOptions> &
  EmailOptions;

export interface SendEmailRequest extends RouteParams<SendEmailBody> {}

async function validate(params: SendEmailRequest) {
  const schema = Joi.object({
    from: Joi.string().trim().required(),
    to: Joi.string().trim().lowercase().email().required(),
    replyTo: Joi.string().trim().lowercase().email().optional(),
    subject: Joi.string().trim().required(),
    text: Joi.when('html', {
      is: Joi.exist(),
      then: Joi.string().trim().allow('').optional(),
      otherwise: Joi.string().trim().required(),
    }),
    html: Joi.when('text', {
      is: Joi.exist(),
      then: Joi.string().trim().allow('').optional(),
      otherwise: Joi.string().trim().required(),
    }),
    headers: Joi.object()
      .pattern(Joi.string().trim().required(), Joi.string().trim().required())
      .optional()
      .default({}),
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

async function handle(params: SendEmailRequest) {
  const { body, userId, user, context } = params;

  const projectApiKey = await authenticateApiKey(context);
  const project = await db.query.projects.findFirst({
    where(fields, { eq }) {
      return eq(fields.id, projectApiKey.projectId);
    },
  });
  if (!project) {
    throw new HttpError('not_found', 'Project not found');
  }

  // TODO: Validate if the sending email is a valid email
  // and it must be verified identity in SES

  return json<SendEmailResponse>({});
}

export const POST: APIRoute = handler(
  handle satisfies HandleRoute<SendEmailRequest>,
  validate satisfies ValidateRoute<SendEmailRequest>,
  {
    isProtected: true,
  },
);
