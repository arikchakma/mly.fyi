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
import type { Project } from '@/db/types';
import { createSESServiceClient, isValidConfiguration } from '@/lib/ses';

export interface ConfigureProjectResponse {
  status: 'ok';
}

export type ConfigureProjectBody = Pick<
  Project,
  'accessKeyId' | 'secretAccessKey'
>;

export interface ConfigureProjectRequest
  extends RouteParams<
    ConfigureProjectBody,
    any,
    {
      projectId: string;
    }
  > {}

async function validate(params: ConfigureProjectRequest) {
  const schema = Joi.object({
    accessKeyId: Joi.string().required(),
    secretAccessKey: Joi.string().required(),
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
    identityId: Joi.string().required(),
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

async function handle(params: ConfigureProjectRequest) {
  const { body, userId, user } = params;
  const { projectId } = params.context.params;

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });

  if (!project) {
    throw new HttpError('not_found', 'Project not found');
  }

  await requireProjectMember(projectId, userId!, ['admin']);

  const { accessKeyId, secretAccessKey } = body;
  if (!accessKeyId || !secretAccessKey) {
    throw new HttpError('bad_request', 'Invalid AWS credentials');
  }

  const sesClient = createSESServiceClient(accessKeyId, secretAccessKey);
  const isValidConfig = await isValidConfiguration(sesClient);
  if (!isValidConfig) {
    throw new HttpError('bad_request', 'Invalid AWS credentials');
  }

  await db
    .update(projects)
    .set({
      accessKeyId,
      secretAccessKey,
    })
    .where(eq(projects.id, projectId));

  return json<ConfigureProjectResponse>({
    status: 'ok',
  });
}

export const PATCH: APIRoute = handler(
  handle satisfies HandleRoute<ConfigureProjectRequest>,
  validate satisfies ValidateRoute<ConfigureProjectRequest>,
  {
    isProtected: true,
  },
);
