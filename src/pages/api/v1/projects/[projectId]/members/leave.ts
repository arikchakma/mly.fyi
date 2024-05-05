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
import { rateLimitMiddleware } from '@/lib/rate-limit';
import { json, jsonWithRateLimit } from '@/lib/response';
import type { APIRoute } from 'astro';
import { and, eq, ne } from 'drizzle-orm';
import Joi from 'joi';

export interface LeaveProjectResponse {
  status: 'ok';
}

export type LeaveProjectBody = {};

export interface LeaveProjectRequest
  extends RouteParams<
    LeaveProjectBody,
    any,
    {
      projectId: string;
    }
  > {}

async function validate(params: LeaveProjectRequest) {
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

async function handle(params: LeaveProjectRequest) {
  const { currentUserId } = params.context.locals;
  const { projectId } = params.context.params;

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });

  if (!project) {
    throw new HttpError('not_found', 'Project not found');
  }

  const currentTeamMember = await requireProjectMember(
    currentUserId!,
    projectId,
  );

  /////////////////////////////////////////////////////////
  // There must be one active admin of the team
  /////////////////////////////////////////////////////////
  const otherAdmin = await db.query.projectMembers.findFirst({
    where: and(
      eq(projectMembers.projectId, projectId),
      ne(projectMembers.userId, currentUserId!),
      eq(projectMembers.status, 'joined'),
      eq(projectMembers.role, 'admin'),
    ),
  });

  if (currentTeamMember.role !== 'admin' && !otherAdmin) {
    throw new HttpError(
      'forbidden',
      'You must be at least one admin in the project',
    );
  }

  /////////////////////////////////////////////////////////
  // Transfer the creator role to the other admin
  /////////////////////////////////////////////////////////
  if (project.creatorId === currentUserId) {
    await db
      .update(projects)
      .set({
        creatorId: otherAdmin?.userId!,
      })
      .where(eq(projects.id, projectId));
  }

  await db
    .delete(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, currentUserId!),
      ),
    );

  return jsonWithRateLimit(
    json<LeaveProjectResponse>({
      status: 'ok',
    }),
    params.context,
  );
}

export const DELETE: APIRoute = handler(
  handle satisfies HandleRoute<LeaveProjectRequest>,
  validate satisfies ValidateRoute<LeaveProjectRequest>,
  [rateLimitMiddleware(), authenticateUser],
);
