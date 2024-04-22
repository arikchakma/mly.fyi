import { db } from '@/db';
import {
  type AllowedProjectMemberRole,
  type AllowedProjectMemberStatus,
  projects,
} from '@/db/schema';
import type { Project } from '@/db/types';
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
import { eq } from 'drizzle-orm';
import Joi from 'joi';

export interface GetProjectResponse extends Project {
  memberId: string;
  role: AllowedProjectMemberRole;
  status: AllowedProjectMemberStatus;
  canManage: boolean;
  isConfigurationComplete: boolean;
}

export interface GetProjectRequest
  extends RouteParams<
    any,
    any,
    {
      projectId: string;
    }
  > {}

async function validate(params: GetProjectRequest) {
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

async function handle(params: GetProjectRequest) {
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

  const { secretAccessKey, accessKeyId, region } = project;
  const isConfigurationComplete = Boolean(
    secretAccessKey && accessKeyId && region,
  );

  return json<GetProjectResponse>({
    ...project,
    status: member.status,
    role: member.role,
    memberId: member.id,
    canManage: ['manager', 'admin'].includes(member.role),
    isConfigurationComplete,
  });
}

export const GET: APIRoute = handler(
  handle satisfies HandleRoute<GetProjectRequest>,
  validate satisfies ValidateRoute<GetProjectRequest>,
  {
    isProtected: true,
  },
);
