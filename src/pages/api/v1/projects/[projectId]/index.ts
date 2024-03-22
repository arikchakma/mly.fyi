import type { APIRoute } from 'astro';
import {
  handler,
  type HandleRoute,
  type RouteParams,
  type ValidateRoute,
} from '@/lib/handler';
import { json } from '@/lib/response';
import { db } from '@/db';
import {
  projectMembers,
  projects,
  type AllowedProjectMemberStatus,
  type AllowedMemberRoles,
} from '@/db/schema';
import type { Project } from '@/db/types';
import { eq } from 'drizzle-orm';
import { HttpError } from '@/lib/http-error';
import { requireProjectMember } from '@/helpers/project';
import Joi from 'joi';

export interface ListProjectResponse extends Project {
  memberId: string;
  role: AllowedMemberRoles;
  status: AllowedProjectMemberStatus;
}

export interface ListProjectRequest
  extends RouteParams<
    any,
    any,
    {
      projectId: string;
    }
  > {}

async function validate(params: ListProjectRequest) {
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

  return params;
}

async function handle(params: ListProjectRequest) {
  const { user: currentUser, context } = params;

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

  const member = await requireProjectMember(currentUser.id, projectId);

  return json<ListProjectResponse>({
    ...project,
    status: member.status,
    role: member.role,
    memberId: member.id,
  });
}

export const GET: APIRoute = handler(
  handle satisfies HandleRoute<ListProjectRequest>,
  validate satisfies ValidateRoute<ListProjectRequest>,
  {
    isProtected: true,
  },
);
