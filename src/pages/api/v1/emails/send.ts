import { db } from '@/db';
import { emailLogEvents, emailLogs } from '@/db/schema';
import { authenticateApiKey } from '@/lib/authenticate-api-key';
import { type SendEmailBody, sendEmail } from '@/lib/email';
import {
  type HandleRoute,
  type RouteParams,
  type ValidateRoute,
  handler,
} from '@/lib/handler';
import { HttpError } from '@/lib/http-error';
import { newId } from '@/lib/new-id';
import { json } from '@/lib/response';
import { DEFAULT_SES_REGION } from '@/lib/ses';
import type { APIRoute } from 'astro';
import Joi from 'joi';

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
    text: Joi.string().trim().allow('').optional(),
    html: Joi.string().trim().allow('').optional(),
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

  if (!value.text && !value.html) {
    throw new HttpError('bad_request', 'Either text or html is required.');
  }

  return {
    ...params,
    body: value,
  };
}

async function handle(params: SendEmailRequest) {
  const { body, context } = params;

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

  if (!identity.configurationSetName) {
    throw new HttpError(
      'bad_request',
      `Configuration set is not configured for ${fromDomain} domain.`,
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
    {
      ...body,
      headers: {
        ...headers,
        'X-SES-CONFIGURATION-SET': identity.configurationSetName,
      },
    },
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
      projectId: project.id,
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
    status: 'sending',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await db.insert(emailLogEvents).values({
    id: emailLogEventId,
    projectId: project.id,
    emailLogId,
    email: to,
    type: 'sending',
    timestamp: new Date(),
  });

  return json<SendEmailResponse>({
    id: emailLogId,
  });
}

export const POST: APIRoute = handler(
  handle satisfies HandleRoute<SendEmailRequest>,
  validate satisfies ValidateRoute<SendEmailRequest>,
);
