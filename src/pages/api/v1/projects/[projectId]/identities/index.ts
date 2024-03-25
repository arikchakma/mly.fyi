import type { APIRoute } from 'astro';
import {
  handler,
  type HandleRoute,
  type RouteParams,
  type ValidateRoute,
} from '@/lib/handler';
import { json } from '@/lib/response';
import { db } from '@/db';
import { projects, projectIdentities } from '@/db/schema';
import type { Project, ProjectIdentity } from '@/db/types';
import { and, count, eq, inArray, or } from 'drizzle-orm';
import { HttpError } from '@/lib/http-error';
import { requireProjectMember } from '@/helpers/project';
import Joi from 'joi';

export interface ListProjectIdentitiesResponse {
  data: Pick<
    ProjectIdentity,
    | 'id'
    | 'projectId'
    | 'type'
    | 'email'
    | 'domain'
    | 'status'
    | 'createdAt'
    | 'updatedAt'
  >[];
  totalCount: number;
  totalPages: number;
  currPage: number;
  perPage: number;
}

export interface ListProjectIdentitiesQuery {
  currPage: number;
  perPage: number;
}

export interface ListProjectIdentitiesRequest
  extends RouteParams<
    any,
    ListProjectIdentitiesQuery,
    {
      projectId: string;
    }
  > {}

async function validate(params: ListProjectIdentitiesRequest) {
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

async function handle(params: ListProjectIdentitiesRequest) {
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
    .from(projectIdentities)
    .where(eq(projectIdentities.projectId, projectId));

  const totalCount = total[0].count;
  const totalPages = Math.ceil(totalCount / perPage);
  const skip = (currPage - 1) * perPage;

  const identities = await db.query.projectIdentities.findMany({
    where: eq(projectIdentities.projectId, projectId),
    offset: skip,
    limit: perPage,
    orderBy: (fields, { desc }) => {
      return desc(fields.createdAt);
    },
    columns: {
      id: true,
      projectId: true,
      type: true,
      email: true,
      domain: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return json<ListProjectIdentitiesResponse>({
    data: identities,
    totalCount,
    totalPages,
    currPage,
    perPage,
  });
}

export const GET: APIRoute = handler(
  handle satisfies HandleRoute<ListProjectIdentitiesRequest>,
  validate satisfies ValidateRoute<ListProjectIdentitiesRequest>,
  {
    isProtected: true,
  },
);
