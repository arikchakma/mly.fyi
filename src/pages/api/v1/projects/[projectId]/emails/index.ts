import type { APIRoute } from 'astro';
import {
  handler,
  type HandleRoute,
  type RouteParams,
  type ValidateRoute,
} from '@/lib/handler';
import { json } from '@/lib/response';
import { db } from '@/db';
import { projects, emailLogs } from '@/db/schema';
import type { EmailLog } from '@/db/types';
import { count, eq } from 'drizzle-orm';
import { HttpError } from '@/lib/http-error';
import { requireProjectMember } from '@/helpers/project';
import Joi from 'joi';

export interface ListProjectEmailsResponse {
  data: Pick<
    EmailLog,
    'id' | 'projectId' | 'to' | 'subject' | 'status' | 'sendAt'
  >[];
  totalCount: number;
  totalPages: number;
  currPage: number;
  perPage: number;
}

export interface ListProjectEmailsQuery {
  currPage: number;
  perPage: number;
}

export interface ListProjectEmailsRequest
  extends RouteParams<
    any,
    ListProjectEmailsQuery,
    {
      projectId: string;
    }
  > {}

async function validate(params: ListProjectEmailsRequest) {
  const paramsSchema = Joi.object({
    projectId: Joi.string().required(),
  });

  const { error: paramsError } = paramsSchema.validate(params.context.params, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (paramsError) {
    throw paramsError;
  }

  const schema = Joi.object({
    currPage: Joi.number().min(1).default(1).optional(),
    perPage: Joi.number().min(1).default(20).optional(),
  });

  const { error, value } = schema.validate(params.query, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    throw error;
  }

  return {
    ...params,
    query: value,
  };
}

async function handle(params: ListProjectEmailsRequest) {
  const { user: currentUser, context, query } = params;
  const { currPage, perPage } = query;

  if (!currentUser) {
    throw new HttpError('unauthorized', 'Unauthorized');
  }

  const { projectId } = context.params;
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });

  if (!project) {
    throw new HttpError('not_found', 'Project not found');
  }

  await requireProjectMember(currentUser.id, projectId);

  const total = await db
    .select({ count: count() })
    .from(emailLogs)
    .where(eq(emailLogs.projectId, projectId));

  const totalCount = total[0].count;
  const totalPages = Math.ceil(totalCount / perPage);
  const skip = (currPage - 1) * perPage;

  const emails = await db.query.emailLogs.findMany({
    where: eq(emailLogs.projectId, projectId),
    offset: skip,
    limit: perPage,
    orderBy: (fields, { desc }) => {
      return desc(fields.createdAt);
    },
    columns: {
      id: true,
      projectId: true,
      to: true,
      subject: true,
      status: true,
      sendAt: true,
    },
  });

  return json<ListProjectEmailsResponse>({
    data: emails,
    totalCount,
    totalPages,
    currPage,
    perPage,
  });
}

export const GET: APIRoute = handler(
  handle satisfies HandleRoute<ListProjectEmailsRequest>,
  validate satisfies ValidateRoute<ListProjectEmailsRequest>,
  {
    isProtected: true,
  },
);
