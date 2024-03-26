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
import { sendEmail, type SendEmailBody } from '@/lib/email';
import { DEFAULT_SES_REGION } from '@/lib/ses';
import { newId } from '@/lib/new-id';
import { emailLogEvents, emailLogs } from '@/db/schema';

export interface SendEmailResponse {
  id: string;
}

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

  const { from, to, replyTo, subject, text, html, headers } = body;
  if (Array.isArray(to) || Array.isArray(replyTo)) {
    throw new HttpError(
      'bad_request',
      'Multiple recipients are not supported.',
    );
  }

  const fromDomain = from.split('@')[1];

  const identity = await db.query.projectIdentities.findFirst({
    where(fields, { and, eq }) {
      return and(
        eq(fields.projectId, project.id),
        eq(fields.domain, fromDomain),
      );
    },
  });
  if (!identity) {
    throw new HttpError(
      'bad_request',
      `You are not allowed to send email from ${fromDomain} domain.`,
    );
  }

  if (identity.status !== 'success') {
    throw new HttpError(
      'bad_request',
      `Identity ${fromDomain} is not verified.`,
    );
  }

  const { accessKeyId, secretAccessKey, region } = project;
  if (!accessKeyId || !secretAccessKey) {
    throw new HttpError('bad_request', 'Invalid project credentials');
  }

  const { data, error } = await sendEmail(
    {
      provider: 'ses',
      ses: {
        accessKeyId,
        secretAccessKey,
        region: region || DEFAULT_SES_REGION,
      },
    },
    body,
  );

  const emailLogId = newId('emailLog');
  const emailLogEventId = newId('emailLogEvent');
  if (error) {
    await db.insert(emailLogs).values({
      id: newId('emailLog'),
      projectId: project.id,
      apiKeyId: projectApiKey.id,
      from,
      to,
      replyTo,
      subject,
      text,
      html,
      status: 'error',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await db.insert(emailLogEvents).values({
      id: emailLogEventId,
      emailLogId,
      email: to,
      type: 'error',
      timestamp: new Date(),
    });
    throw new HttpError('bad_request', error.message);
  }

  await db.insert(emailLogs).values({
    id: emailLogId,
    messageId: data.messageId,
    projectId: project.id,
    apiKeyId: projectApiKey.id,
    from,
    to,
    replyTo,
    subject,
    text,
    html,
    status: 'sent',
    sendAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await db.insert(emailLogEvents).values({
    id: emailLogEventId,
    emailLogId,
    email: to,
    type: 'sent',
    timestamp: new Date(),
  });

  return json<SendEmailResponse>({
    id: emailLogId,
  });
}

export const POST: APIRoute = handler(
  handle satisfies HandleRoute<SendEmailRequest>,
  validate satisfies ValidateRoute<SendEmailRequest>,
  {
    isProtected: true,
  },
);
