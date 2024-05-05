import { db } from '@/db';
import { projectIdentities, projects } from '@/db/schema';
import {
  requireProjectConfiguration,
  requireProjectMember,
} from '@/helpers/project';
import { authenticateUser } from '@/lib/authenticate-user';
import { deleteConfigurationSet } from '@/lib/configuration-set';
import { deleteIdentity } from '@/lib/domain';
import {
  type HandleRoute,
  type RouteParams,
  type ValidateRoute,
  handler,
} from '@/lib/handler';
import { HttpError } from '@/lib/http-error';
import { rateLimitMiddleware } from '@/lib/rate-limit';
import { json, jsonWithRateLimit } from '@/lib/response';
import { createSESServiceClient } from '@/lib/ses';
import type { APIRoute } from 'astro';
import { and, eq } from 'drizzle-orm';
import Joi from 'joi';

export interface DeleteProjectIdentityResponse {
  status: 'ok';
}

export type DeleteProjectIdentityQuery = {
  mode: 'strict' | 'soft';
};

export type DeleteProjectIdentityBody = {};

export interface DeleteProjectIdentityRequest
  extends RouteParams<
    DeleteProjectIdentityBody,
    DeleteProjectIdentityQuery,
    {
      projectId: string;
      identityId: string;
    }
  > {}

async function validate(params: DeleteProjectIdentityRequest) {
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

  const querySchema = Joi.object({
    mode: Joi.string().valid('strict', 'soft').optional().default('soft'),
  });

  const { error: queryError, value: queryValue } = querySchema.validate(
    params.query,
    {
      abortEarly: false,
      stripUnknown: true,
    },
  );

  if (queryError) {
    throw queryError;
  }

  return {
    ...params,
    query: queryValue,
  };
}

async function handle(params: DeleteProjectIdentityRequest) {
  const { context } = params;
  const { currentUser } = params.context.locals;
  const { mode = 'soft' } = params.query;

  if (!currentUser) {
    throw new HttpError('unauthorized', 'Unauthorized');
  }

  const { projectId, identityId } = context.params;
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });

  if (!project) {
    throw new HttpError('not_found', 'Project not found');
  }

  await requireProjectMember(currentUser.id, projectId, ['admin', 'manager']);
  await requireProjectConfiguration(project);

  const identity = await db.query.projectIdentities.findFirst({
    where: and(
      eq(projectIdentities.id, identityId),
      eq(projectIdentities.projectId, projectId),
    ),
  });

  if (!identity) {
    throw new HttpError('not_found', 'Identity not found');
  }

  if (identity.type !== 'domain' || !identity.domain) {
    throw new HttpError('bad_request', 'Identity is not a domain');
  }

  const { accessKeyId, secretAccessKey, region } = project;
  if (!accessKeyId || !secretAccessKey || !region) {
    throw new HttpError('bad_request', 'Project does not have AWS credentials');
  }

  const sesClient = createSESServiceClient(
    accessKeyId,
    secretAccessKey,
    region,
  );

  // Remove identity from SES if mode is strict otherwise just remove from db
  // also remove the configuration set on both cases
  await deleteConfigurationSet(sesClient, identity.configurationSetName!);
  if (mode === 'strict') {
    await deleteIdentity(sesClient, identity.domain);
  }
  await db
    .delete(projectIdentities)
    .where(
      and(
        eq(projectIdentities.id, identityId),
        eq(projectIdentities.projectId, projectId),
      ),
    );

  return jsonWithRateLimit(
    json<DeleteProjectIdentityResponse>({
      status: 'ok',
    }),
    context,
  );
}

export const DELETE: APIRoute = handler(
  handle satisfies HandleRoute<DeleteProjectIdentityRequest>,
  validate satisfies ValidateRoute<DeleteProjectIdentityRequest>,
  [rateLimitMiddleware(), authenticateUser],
);
