import { db } from '@/db';
import { projectApiKeys, projects } from '@/db/schema';
import type { ProjectApiKey } from '@/db/types';
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

export interface GetProjectApiKeyResponse extends Omit<ProjectApiKey, 'key'> {}

export interface GetProjectApiKeyQuery {}

export interface GetProjectApiKeyRequest
  extends RouteParams<
    any,
    GetProjectApiKeyQuery,
    {
      projectId: string;
      keyId: string;
    }
  > {}

async function validate(params: GetProjectApiKeyRequest) {
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

async function handle(params: GetProjectApiKeyRequest) {
  const { user: currentUser, context, query } = params;

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

  await requireProjectMember(currentUser.id, projectId);

  const apiKey = await db.query.projectApiKeys.findFirst({
    where: and(
      eq(projectApiKeys.projectId, projectId),
      eq(projectApiKeys.id, keyId),
    ),
    columns: {
      key: false,
    },
  });
  if (!apiKey) {
    throw new HttpError('not_found', 'API key not found');
  }

  return json<GetProjectApiKeyResponse>(apiKey);
}

export const GET: APIRoute = handler(
  handle satisfies HandleRoute<GetProjectApiKeyRequest>,
  validate satisfies ValidateRoute<GetProjectApiKeyRequest>,
  {
    isProtected: true,
  },
);
