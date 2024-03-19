import type { APIRoute } from 'astro';
import {
  handler,
  type HandleRoute,
  type RouteParams,
  type ValidateRoute,
} from '@/lib/handler';
import { json } from '@/lib/response';
import Joi from 'joi';
import { db } from '@/db';
import { eq } from 'drizzle-orm';
import { projectMembers, projects, users } from '@/db/schema';
import { HttpError } from '@/lib/http-error';
import { v4 as uuidV4 } from 'uuid';
import { newId } from '@/lib/new-id';
import { hashPassword } from '@/lib/hash';
import type { Project } from '@/db/types';

export interface RegisterResponse
  extends Pick<Project, 'id' | 'name' | 'url' | 'timezone'> {}

export type RegisterBody = Pick<Project, 'name' | 'timezone' | 'url'>;
export interface RegisterRequest extends RouteParams<RegisterBody> {}

async function validate(params: RegisterRequest) {
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

async function handle(params: RegisterRequest) {
  const { body, userId, user } = params;
  const { name, timezone, url } = body;

  const projectId = newId('project');
  const apiKey = uuidV4();

  const project = await db
    .insert(projects)
    .values({
      id: projectId,
      creatorId: userId!,
      name,
      url,
      timezone,
      apiKey,
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
  });

  return json<RegisterResponse>(project?.[0]);
}

export const POST: APIRoute = handler(
  handle satisfies HandleRoute<RegisterRequest>,
  validate satisfies ValidateRoute<RegisterRequest>,
  {
    isProtected: true,
  },
);
