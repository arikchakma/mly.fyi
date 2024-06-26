import { db } from '@/db';
import { projectMembers, projects, users } from '@/db/schema';
import type { ProjectMember } from '@/db/types';
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
import { eq, inArray } from 'drizzle-orm';
import Joi from 'joi';

export type GetProjectMembersResponse = (ProjectMember & {
  name: string;
})[];

export interface GetProjectMembersRequest
  extends RouteParams<
    any,
    any,
    {
      projectId: string;
    }
  > {}

async function validate(params: GetProjectMembersRequest) {
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

async function handle(params: GetProjectMembersRequest) {
  const { context } = params;
  const { currentUser } = params.context.locals;

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

  const members = await db.query.projectMembers.findMany({
    where: eq(projectMembers.projectId, projectId),
  });

  const userIds = members
    .filter((member) => member?.userId)
    .map((member) => member.userId) as string[];
  const associatedUsers = await db
    .select({
      id: users.id,
      name: users.name,
    })
    .from(users)
    .where(inArray(users.id, userIds));

  const enrichedMembers = members.map((member) => {
    const user = associatedUsers.find((u) => u.id === member.userId);

    return {
      ...member,
      name: user?.name || 'Unknown',
    };
  });

  return jsonWithRateLimit(
    json<GetProjectMembersResponse>(enrichedMembers),
    context,
  );
}

export const GET: APIRoute = handler(
  handle satisfies HandleRoute<GetProjectMembersRequest>,
  validate satisfies ValidateRoute<GetProjectMembersRequest>,
  [rateLimitMiddleware(), authenticateUser],
);
