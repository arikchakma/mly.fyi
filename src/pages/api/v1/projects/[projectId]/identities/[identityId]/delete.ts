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
import { projectIdentities, projects } from '@/db/schema';
import { requireProjectMember } from '@/helpers/project';
import { and, eq } from 'drizzle-orm';
import { HttpError } from '@/lib/http-error';
import {
  updateConfigurationSetEvent,
  createConfigurationSetTrackingOptions,
  type SetEventType,
  deleteConfigurationSet,
} from '@/lib/configuration-set';
import {
  createSESServiceClient,
  DEFAULT_SES_REGION,
  isValidConfiguration,
} from '@/lib/ses';
import { createSNSServiceClient } from '@/lib/notification';
import { deleteIdentity, getRedirectDomain } from '@/lib/domain';

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

  const { accessKeyId, secretAccessKey, region = DEFAULT_SES_REGION } = project;
  if (!accessKeyId || !secretAccessKey) {
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
