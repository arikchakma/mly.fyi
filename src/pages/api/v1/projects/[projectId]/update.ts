import { db } from '@/db';
import { projects } from '@/db/schema';
import type { Project } from '@/db/types';
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
import { createSESServiceClient, isValidConfiguration } from '@/lib/ses';
import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import Joi from 'joi';

export interface UpdateProjectResponse {
  status: 'ok';
}

export type UpdateProjectBody = Pick<Project, 'name' | 'url' | 'timezone'>;

export interface UpdateProjectRequest
  extends RouteParams<
    UpdateProjectBody,
    any,
    {
      projectId: string;
    }
  > {}

async function validate(params: UpdateProjectRequest) {
  const schema = Joi.object({
    name: Joi.string().trim().min(3).required(),
    timezone: Joi.string().trim().required(),
    url: Joi.string().trim().uri().required(),
  });

  const { error, value } = schema.validate(params.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    throw error;
  }

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

  return {
    ...params,
    body: value,
  };
}

async function handle(params: UpdateProjectRequest) {
  const { body } = params;
  const { projectId } = params.context.params;
  const { currentUserId } = params.context.locals;

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });

  if (!project) {
    throw new HttpError('not_found', 'Project not found');
  }

  await requireProjectMember(currentUserId!, projectId, ['admin', 'manager']);

  const { name, url, timezone } = body;
  await db
    .update(projects)
    .set({
      name,
      url,
      timezone,
    })
    .where(eq(projects.id, projectId));

  return json<UpdateProjectResponse>({
    status: 'ok',
  });
}

export const PATCH: APIRoute = handler(
  handle satisfies HandleRoute<UpdateProjectRequest>,
  validate satisfies ValidateRoute<UpdateProjectRequest>,
  [authenticateUser],
);
