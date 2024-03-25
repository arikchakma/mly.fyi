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
import { projectApiKeys, projects } from '@/db/schema';
import { newApiKey, newId } from '@/lib/new-id';
import { requireProjectMember } from '@/helpers/project';
import { eq } from 'drizzle-orm';
import { HttpError } from '@/lib/http-error';

export interface CreateProjectApiKeyResponse {
  key: string;
}

export type CreateProjectApiKeyBody = {
  name: string;
};

export interface CreateProjectApiKeyRequest
  extends RouteParams<
    CreateProjectApiKeyBody,
    any,
    {
      projectId: string;
    }
  > {}

async function validate(params: CreateProjectApiKeyRequest) {
  const schema = Joi.object({
    name: Joi.string().min(3).required(),
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

async function handle(params: CreateProjectApiKeyRequest) {
  const { body, userId, user } = params;
  const { projectId } = params.context.params;

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });

  if (!project) {
    throw new HttpError('not_found', 'Project not found');
  }

  await requireProjectMember(userId!, projectId, ['admin']);

  const apiKeyId = newId('key');
  const key = newApiKey();

  await db.insert(projectApiKeys).values({
    id: apiKeyId,
    name: body.name,
    projectId,
    creatorId: userId!,
    key,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return json<CreateProjectApiKeyResponse>({
    key,
  });
}

export const POST: APIRoute = handler(
  handle satisfies HandleRoute<CreateProjectApiKeyRequest>,
  validate satisfies ValidateRoute<CreateProjectApiKeyRequest>,
  {
    isProtected: true,
  },
);