import { db } from '@/db';
import {
  allowedProjectMemberRoles,
  projectMembers,
  projects,
} from '@/db/schema';
import type { AllowedProjectMemberRole } from '@/db/types';
import { requireProjectMember } from '@/helpers/project';
import { authenticateUser } from '@/lib/authenticate-user';
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

export interface UpdateProjectMemberResponse {
  status: 'ok';
}

export type UpdateProjectMemberBody = {
  role: AllowedProjectMemberRole;
};

export interface UpdateProjectMemberRequest
  extends RouteParams<
    UpdateProjectMemberBody,
    any,
    {
      projectId: string;
      memberId: string;
    }
  > {}

async function validate(params: UpdateProjectMemberRequest) {
  const paramSchema = Joi.object({
    projectId: Joi.string().required(),
    memberId: Joi.string().required(),
  });

  const { error: paramError } = paramSchema.validate(params.context.params, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (paramError) {
    throw paramError;
  }

  const schema = Joi.object({
    role: Joi.string()
      .valid(...allowedProjectMemberRoles)
      .required(),
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

async function handle(params: UpdateProjectMemberRequest) {
  const { body } = params;
  const { currentUserId } = params.context.locals;
  const { projectId, memberId } = params.context.params;

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });

  if (!project) {
    throw new HttpError('not_found', 'Project not found');
  }

  await requireProjectMember(currentUserId!, projectId, ['admin', 'manager']);

  const { role } = body;

  const member = await db.query.projectMembers.findFirst({
    where: and(
      eq(projectMembers.projectId, projectId),
      eq(projectMembers.id, memberId),
    ),
  });
  if (!member) {
    throw new HttpError('not_found', 'Member not found');
  }

  await db
    .update(projectMembers)
    .set({
      role,
    })
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.id, memberId),
      ),
    );

  return json<UpdateProjectMemberResponse>({
    status: 'ok',
  });
}

export const PATCH: APIRoute = handler(
  handle satisfies HandleRoute<UpdateProjectMemberRequest>,
  validate satisfies ValidateRoute<UpdateProjectMemberRequest>,
  [authenticateUser],
);
