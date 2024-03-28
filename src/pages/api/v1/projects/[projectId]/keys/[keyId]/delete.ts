import { db } from '@/db';
import { projectApiKeys, projects } from '@/db/schema';
import { requireProjectMember } from '@/helpers/project';
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

export interface DeleteApiKeyResponse {
  status: 'ok';
}

export type DeleteApiKeyBody = {};

export interface DeleteApiKeyRequest
  extends RouteParams<
    DeleteApiKeyBody,
    any,
    {
      projectId: string;
      keyId: string;
    }
  > {}

async function validate(params: DeleteApiKeyRequest) {
  const paramsSchema = Joi.object({
    projectId: Joi.string().required(),
    keyId: Joi.string().required(),
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

async function handle(params: DeleteApiKeyRequest) {
  const { user: currentUser, context } = params;

  if (!currentUser) {
    throw new HttpError('unauthorized', 'Unauthorized');
  }

  const { projectId, keyId } = context.params;
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });

  if (!project) {
    throw new HttpError('not_found', 'Project not found');
  }

  await requireProjectMember(currentUser.id, projectId, ['admin', 'manager']);

  const apiKey = await db.query.projectApiKeys.findFirst({
    where: and(
      eq(projectApiKeys.projectId, projectId),
      eq(projectApiKeys.id, keyId),
    ),
  });

  if (!apiKey) {
    throw new HttpError('not_found', 'API Key not found');
  }

  await db
    .delete(projectApiKeys)
    .where(
      and(
        eq(projectApiKeys.projectId, projectId),
        eq(projectApiKeys.id, keyId),
      ),
    );

  return json<DeleteApiKeyResponse>({
    status: 'ok',
  });
}

export const DELETE: APIRoute = handler(
  handle satisfies HandleRoute<DeleteApiKeyRequest>,
  validate satisfies ValidateRoute<DeleteApiKeyRequest>,
  {
    isProtected: true,
  },
);
