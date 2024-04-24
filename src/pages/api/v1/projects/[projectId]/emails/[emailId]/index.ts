import { db } from '@/db';
import { emailLogEvents, emailLogs, projects } from '@/db/schema';
import type { EmailLog, EmailLogEvent } from '@/db/types';
import { requireProjectMember } from '@/helpers/project';
import {
  type HandleRoute,
  type RouteParams,
  type ValidateRoute,
  handler,
} from '@/lib/handler';
import { HttpError } from '@/lib/http-error';
import { json } from '@/lib/response';
import type { APIRoute } from 'astro';
import { and, eq } from 'drizzle-orm';
import Joi from 'joi';

export interface GetProjectEmailResponse
  extends Omit<EmailLog, 'messageId' | 'apiKeyId'> {
  events: Omit<EmailLogEvent, 'rawResponse'>[];
}

export interface GetProjectEmailQuery {}

export interface GetProjectEmailRequest
  extends RouteParams<
    any,
    GetProjectEmailQuery,
    {
      projectId: string;
      emailId: string;
    }
  > {}

async function validate(params: GetProjectEmailRequest) {
  const paramsSchema = Joi.object({
    projectId: Joi.string().required(),
    emailId: Joi.string().required(),
  });

  const { error: paramsError } = paramsSchema.validate(params.context.params, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (paramsError) {
    throw paramsError;
  }

  return params;
}

async function handle(params: GetProjectEmailRequest) {
  const { context } = params;
  const { currentUser } = params.context.locals;

  if (!currentUser) {
    throw new HttpError('unauthorized', 'Unauthorized');
  }

  const { projectId, emailId } = context.params;
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });

  if (!project) {
    throw new HttpError('not_found', 'Project not found');
  }

  await requireProjectMember(currentUser.id, projectId);

  const emailLog = await db.query.emailLogs.findFirst({
    where: and(eq(emailLogs.id, emailId), eq(emailLogs.projectId, projectId)),
    columns: {
      messageId: false,
      apiKeyId: false,
    },
  });

  if (!emailLog) {
    throw new HttpError('not_found', 'Email not found');
  }

  const emailEvents = await db.query.emailLogEvents.findMany({
    where: eq(emailLogEvents.emailLogId, emailLog.id),
    columns: {
      rawResponse: false,
    },
  });

  return json<GetProjectEmailResponse>({
    ...emailLog,
    events: emailEvents,
  });
}

export const GET: APIRoute = handler(
  handle satisfies HandleRoute<GetProjectEmailRequest>,
  validate satisfies ValidateRoute<GetProjectEmailRequest>,
  {
    isProtected: true,
  },
);
