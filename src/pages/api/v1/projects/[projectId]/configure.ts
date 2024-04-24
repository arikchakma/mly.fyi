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

export interface ConfigureProjectResponse {
  status: 'ok';
}

export type ConfigureProjectBody = Pick<
  Project,
  'accessKeyId' | 'secretAccessKey' | 'region'
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
    region: Joi.string().required(),
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

async function handle(params: ConfigureProjectRequest) {
  const { body } = params;
  const { projectId } = params.context.params;
  const { currentUserId } = params.context.locals;

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });

  if (!project) {
    throw new HttpError('not_found', 'Project not found');
  }

  await requireProjectMember(currentUserId!, projectId, ['admin']);

  const { accessKeyId, secretAccessKey, region } = body;
  if (!accessKeyId || !secretAccessKey || !region) {
    throw new HttpError('bad_request', 'Invalid AWS credentials');
  }

  const sesClient = createSESServiceClient(
    accessKeyId,
    secretAccessKey,
    region,
  );
  const isValidConfig = await isValidConfiguration(sesClient);
  if (!isValidConfig) {
    throw new HttpError('bad_request', 'Invalid AWS credentials');
  }

  await db
    .update(projects)
    .set({
      accessKeyId,
      secretAccessKey,
      region,
    })
    .where(eq(projects.id, projectId));

  return json<ConfigureProjectResponse>({
    status: 'ok',
  });
}

export const PATCH: APIRoute = handler(
  handle satisfies HandleRoute<ConfigureProjectRequest>,
  validate satisfies ValidateRoute<ConfigureProjectRequest>,
  [authenticateUser],
);
