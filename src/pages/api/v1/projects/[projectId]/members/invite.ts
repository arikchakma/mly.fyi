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
import { newId } from '@/lib/new-id';
import { json } from '@/lib/response';
import type { APIRoute } from 'astro';
import { and, eq } from 'drizzle-orm';
import Joi from 'joi';

export interface InviteProjectMemberResponse {
  status: 'ok';
}

export type InviteProjectMemberBody = {
  email: string;
  role: AllowedProjectMemberRole;
};

export interface InviteProjectMemberRequest
  extends RouteParams<
    InviteProjectMemberBody,
    any,
    {
      projectId: string;
    }
  > {}

async function validate(params: InviteProjectMemberRequest) {
  const schema = Joi.object({
    email: Joi.string().email().required(),
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

async function handle(params: InviteProjectMemberRequest) {
  const { body } = params;
  const { currentUserId } = params.context.locals;
  const { projectId } = params.context.params;

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });

  if (!project) {
    throw new HttpError('not_found', 'Project not found');
  }

  await requireProjectMember(currentUserId!, projectId, ['admin', 'manager']);

  const { role, email } = body;
  const alreadyInvited = await db.query.projectMembers.findFirst({
    where: and(
      eq(projectMembers.projectId, projectId),
      eq(projectMembers.invitedEmail, email),
    ),
  });

  if (alreadyInvited?.status === 'invited') {
    throw new HttpError('bad_request', 'User already invited');
  } else if (alreadyInvited?.status === 'joined') {
    throw new HttpError('bad_request', 'User already joined');
  } else if (alreadyInvited?.status === 'rejected') {
    throw new HttpError('bad_request', 'User already rejected');
  }

  const newMemberId = newId('projectMember');
  await db.insert(projectMembers).values({
    id: newMemberId,
    projectId,
    invitedEmail: email,
    role,
    status: 'invited',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // TODO: Send invitation email

  return json<InviteProjectMemberResponse>({
    status: 'ok',
  });
}

export const POST: APIRoute = handler(
  handle satisfies HandleRoute<InviteProjectMemberRequest>,
  validate satisfies ValidateRoute<InviteProjectMemberRequest>,
  [authenticateUser],
);
