import { db } from '@/db';
import { projectIdentities, projects } from '@/db/schema';
import {
  requireProjectConfiguration,
  requireProjectMember,
} from '@/helpers/project';
import {
  type SetEventType,
  createConfigurationSetTrackingOptions,
  deleteConfigurationSet,
  updateConfigurationSetEvent,
} from '@/lib/configuration-set';
import { deleteIdentity, getRedirectDomain } from '@/lib/domain';
import {
  type HandleRoute,
  type RouteParams,
  type ValidateRoute,
  handler,
} from '@/lib/handler';
import { HttpError } from '@/lib/http-error';
import { createSNSServiceClient } from '@/lib/notification';
import { json } from '@/lib/response';
import { createSESServiceClient, isValidConfiguration } from '@/lib/ses';
import type { APIRoute } from 'astro';
import { and, eq } from 'drizzle-orm';
import Joi from 'joi';

export interface DeleteProjectIdentityResponse {
  status: 'ok';
}

export type DeleteProjectIdentityBody = {};

export interface DeleteProjectIdentityRequest
  extends RouteParams<
    DeleteProjectIdentityBody,
    any,
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

  return params;
}

async function handle(params: DeleteProjectIdentityRequest) {
  const { user: currentUser, context } = params;

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

  const isValidConfig = await isValidConfiguration(sesClient);
  if (!isValidConfig) {
    throw new HttpError('bad_request', 'Invalid AWS credentials');
  }

  await deleteConfigurationSet(sesClient, identity.configurationSetName!);
  await deleteIdentity(sesClient, identity.domain);
  await db
    .delete(projectIdentities)
    .where(
      and(
        eq(projectIdentities.id, identityId),
        eq(projectIdentities.projectId, projectId),
      ),
    );

  return json<DeleteProjectIdentityResponse>({
    status: 'ok',
  });
}

export const DELETE: APIRoute = handler(
  handle satisfies HandleRoute<DeleteProjectIdentityRequest>,
  validate satisfies ValidateRoute<DeleteProjectIdentityRequest>,
  {
    isProtected: true,
  },
);
