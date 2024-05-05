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
import { and, eq } from 'drizzle-orm';
import Joi from 'joi';

export interface ResendProjectMemberInviteResponse {
  status: 'ok';
}

export type ResendProjectMemberInviteBody = {};

export interface ResendProjectMemberInviteRequest
  extends RouteParams<
    ResendProjectMemberInviteBody,
    any,
    {
      projectId: string;
      memberId: string;
    }
  > {}

async function validate(params: ResendProjectMemberInviteRequest) {
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

async function handle(params: ResendProjectMemberInviteRequest) {
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

  // Send invitation email to the member again and increment the invite count

  return jsonWithRateLimit(
    json<ResendProjectMemberInviteResponse>({
      status: 'ok',
    }),
    params.context,
  );
}

export const PATCH: APIRoute = handler(
  handle satisfies HandleRoute<ResendProjectMemberInviteRequest>,
  validate satisfies ValidateRoute<ResendProjectMemberInviteRequest>,
  [rateLimitMiddleware(), authenticateUser],
);
