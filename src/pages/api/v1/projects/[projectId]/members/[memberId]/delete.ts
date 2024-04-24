import { db } from '@/db';
import { projectMembers, projects } from '@/db/schema';
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
import { and, eq, ne } from 'drizzle-orm';
import Joi from 'joi';

export interface DeleteProjectMemberResponse {
  status: 'ok';
}

export type DeleteProjectMemberBody = {};

export interface DeleteProjectMemberRequest
  extends RouteParams<
    DeleteProjectMemberBody,
    any,
    {
      projectId: string;
      memberId: string;
    }
  > {}

async function validate(params: DeleteProjectMemberRequest) {
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

  return params;
}

async function handle(params: DeleteProjectMemberRequest) {
  const { currentUserId } = params.context.locals;
  const { projectId, memberId } = params.context.params;

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });

  if (!project) {
    throw new HttpError('not_found', 'Project not found');
  }

  await requireProjectMember(currentUserId!, projectId, ['admin', 'manager']);

  const member = await db.query.projectMembers.findFirst({
    where: and(
      eq(projectMembers.projectId, projectId),
      eq(projectMembers.id, memberId),
    ),
  });
  if (!member) {
    throw new HttpError('not_found', 'Member not found');
  }

  if (member?.userId && member.userId === currentUserId) {
    throw new HttpError(
      'bad_request',
      'You cannot delete yourself from the project',
    );
  }

  if (member.role === 'admin' && member.status === 'joined') {
    const otherAdmin = await db.query.projectMembers.findFirst({
      where: and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.status, 'joined'),
        eq(projectMembers.role, 'admin'),
        ne(projectMembers.id, memberId),
      ),
    });

    if (!otherAdmin) {
      throw new HttpError(
        'bad_request',
        'Cannot delete the last admin from the project',
      );
    }

    // Transfer the project creator role to the next admin
    if (project.creatorId === member.userId) {
      await db
        .update(projects)
        .set({
          creatorId: otherAdmin.userId!,
        })
        .where(eq(projects.id, projectId));
    }
  }

  await db
    .delete(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.id, memberId),
      ),
    );

  // TODO: Send email to the member that they have been removed from the project

  return json<DeleteProjectMemberResponse>({
    status: 'ok',
  });
}

export const DELETE: APIRoute = handler(
  handle satisfies HandleRoute<DeleteProjectMemberRequest>,
  validate satisfies ValidateRoute<DeleteProjectMemberRequest>,
  [authenticateUser],
);
