import { db } from '@/db';
import { projectApiKeys, projects } from '@/db/schema';
import type { ProjectApiKey } from '@/db/types';
import { requireProjectMember } from '@/helpers/project';
import { authenticateUser } from '@/lib/authenticate-user';
import {
  type HandleRoute,
  type RouteParams,
  type ValidateRoute,
  handler,
} from '@/lib/handler';
import { HttpError } from '@/lib/http-error';
import { rateLimitMiddleware } from '@/lib/rate-limit';
import { json, jsonWithRateLimit } from '@/lib/response';
import type { APIRoute } from 'astro';
import { count, eq } from 'drizzle-orm';
import Joi from 'joi';

export interface ListProjectApiKeysResponse {
  data: Omit<ProjectApiKey, 'key' | 'usageCount'>[];
  totalCount: number;
  totalPages: number;
  currPage: number;
  perPage: number;
}

export interface ListProjectApiKeysQuery {
  currPage: number;
  perPage: number;
}

export interface ListProjectApiKeysRequest
  extends RouteParams<
    any,
    ListProjectApiKeysQuery,
    {
      projectId: string;
    }
  > {}

async function validate(params: ListProjectApiKeysRequest) {
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

async function handle(params: ListProjectApiKeysRequest) {
  const { currentUser } = params.context.locals;
  const { context, query } = params;
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
    .from(projectApiKeys)
    .where(eq(projectApiKeys.projectId, projectId));

  const totalCount = total[0].count;
  const totalPages = Math.ceil(totalCount / perPage);
  const skip = (currPage - 1) * perPage;

  const apiKeys = await db.query.projectApiKeys.findMany({
    where: eq(projectApiKeys.projectId, projectId),
    offset: skip,
    limit: perPage,
    orderBy: (fields, { desc }) => {
      return desc(fields.createdAt);
    },
    columns: {
      key: false,
      usageCount: false,
    },
  });

  return jsonWithRateLimit(
    json<ListProjectApiKeysResponse>({
      data: apiKeys,
      totalCount,
      totalPages,
      currPage,
      perPage,
    }),
    context,
  );
}

export const GET: APIRoute = handler(
  handle satisfies HandleRoute<ListProjectApiKeysRequest>,
  validate satisfies ValidateRoute<ListProjectApiKeysRequest>,
  [rateLimitMiddleware(), authenticateUser],
);
