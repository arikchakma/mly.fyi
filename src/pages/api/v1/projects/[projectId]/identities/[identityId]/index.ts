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

export interface GetProjectIdentityResponse
  extends Omit<ProjectIdentity, 'configurationSetName'> {}

export interface GetProjectIdentityQuery {}

export interface GetProjectIdentityRequest
  extends RouteParams<
    any,
    GetProjectIdentityQuery,
    {
      projectId: string;
      identityId: string;
    }
  > {}

async function validate(params: GetProjectIdentityRequest) {
  const paramsSchema = Joi.object({
    projectId: Joi.string().required(),
    identityId: Joi.string().required(),
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

async function handle(params: GetProjectIdentityRequest) {
  const { user: currentUser, context, query } = params;

  if (!currentUser) {
    throw new HttpError('unauthorized', 'Unauthorized');
  }

  const { projectId, identityId } = context.params;
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });

  if (!project) {
    throw new HttpError('not_found', 'Project not found');
  }

  await requireProjectMember(currentUser.id, projectId);

  const identity = await db.query.projectIdentities.findFirst({
    where: and(
      eq(projectIdentities.id, identityId),
      eq(projectIdentities.projectId, projectId),
    ),
    columns: {
      configurationSetName: false,
    },
  });

  if (!identity) {
    throw new HttpError('not_found', 'Identity not found');
  }

  return json<GetProjectIdentityResponse>(identity);
}

export const GET: APIRoute = handler(
  handle satisfies HandleRoute<GetProjectIdentityRequest>,
  validate satisfies ValidateRoute<GetProjectIdentityRequest>,
  {
    isProtected: true,
  },
);
