import { db } from '@/db';
import { projectMembers, projects } from '@/db/schema';
import type { Project } from '@/db/types';
import {
  type HandleRoute,
  type RouteParams,
  type ValidateRoute,
  handler,
} from '@/lib/handler';
import { newId } from '@/lib/new-id';
import { json } from '@/lib/response';
import type { APIRoute } from 'astro';
import Joi from 'joi';

export interface CreateProjectResponse
  extends Pick<Project, 'id' | 'name' | 'url' | 'timezone'> {}

export type CreateProjectBody = Pick<Project, 'name' | 'timezone' | 'url'>;
export interface CreateProjectRequest extends RouteParams<CreateProjectBody> {}

async function validate(params: CreateProjectRequest) {
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

  return {
    ...params,
    body: value,
  };
}

async function handle(params: CreateProjectRequest) {
  const { body, userId, user } = params;
  const { name, timezone, url } = body;

  const projectId = newId('project');

  const project = await db
    .insert(projects)
    .values({
      id: projectId,
      creatorId: userId!,
      name,
      url,
      timezone,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({
      id: projects.id,
      name: projects.name,
      url: projects.url,
      timezone: projects.timezone,
    });

  const memberId = newId('projectMember');
  await db.insert(projectMembers).values({
    id: memberId,
    projectId,
    userId: userId!,
    invitedEmail: user?.email!,
    role: 'admin',
    status: 'joined',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return json<CreateProjectResponse>(project?.[0]);
}

export const POST: APIRoute = handler(
  handle satisfies HandleRoute<CreateProjectRequest>,
  validate satisfies ValidateRoute<CreateProjectRequest>,
  {
    isProtected: true,
  },
);
