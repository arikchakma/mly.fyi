import { db } from '@/db';
import { projectMembers, projects } from '@/db/schema';
import type { AllowedProjectMemberRole } from '@/db/types';
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

export interface GetProjectMemberInviteInfoResponse {
  project: {
    id: string;
    name: string;
  };
  invitedMember: {
    id: string;
    email: string;
    role: AllowedProjectMemberRole;
  };
}

export type GetProjectMemberInviteInfoBody = {};

export interface GetProjectMemberInviteInfoRequest
  extends RouteParams<
    GetProjectMemberInviteInfoBody,
    any,
    {
      inviteId: string;
    }
  > {}

async function validate(params: GetProjectMemberInviteInfoRequest) {
  const paramSchema = Joi.object({
    inviteId: Joi.string().required(),
  });

  const { error: paramError } = paramSchema.validate(params.context.params, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (paramError) {
    throw paramError;
  }

  return params;
}

async function handle(params: GetProjectMemberInviteInfoRequest) {
  const { user: currentUser } = params;
  const { inviteId } = params.context.params;

  const invitedMember = await db.query.projectMembers.findFirst({
    where: and(eq(projectMembers.id, inviteId)),
  });

  if (!invitedMember) {
    throw new HttpError('not_found', 'Invite not found');
  }

  if (invitedMember.status !== 'invited') {
    throw new HttpError('forbidden', 'Invite has already been responded');
  }

  if (invitedMember.invitedEmail !== currentUser?.email) {
    throw new HttpError('forbidden', 'You are not allowed to view this invite');
  }

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, invitedMember.projectId),
  });
  if (!project) {
    throw new HttpError('not_found', 'Project not found');
  }

  return json<GetProjectMemberInviteInfoResponse>({
    project: {
      id: project.id,
      name: project.name,
    },
    invitedMember: {
      id: invitedMember.id,
      email: invitedMember.invitedEmail,
      role: invitedMember.role,
    },
  });
}

export const GET: APIRoute = handler(
  handle satisfies HandleRoute<GetProjectMemberInviteInfoRequest>,
  validate satisfies ValidateRoute<GetProjectMemberInviteInfoRequest>,
  {
    isProtected: true,
  },
);
