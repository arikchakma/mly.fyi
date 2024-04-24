import { db } from '@/db';
import { projectIdentities, projects } from '@/db/schema';
import {
  requireProjectConfiguration,
  requireProjectMember,
} from '@/helpers/project';
import { authenticateUser } from '@/lib/authenticate-user';
import {
  type SetEventType,
  createConfigurationSetTrackingOptions,
  updateConfigurationSetEvent,
} from '@/lib/configuration-set';
import { getRedirectDomain } from '@/lib/domain';
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

export interface UpdateProjectIdentityResponse {
  status: 'ok';
}

export type UpdateProjectIdentityBody = {
  openTracking?: boolean;
  clickTracking?: boolean;
};

export interface UpdateProjectIdentityRequest
  extends RouteParams<
    UpdateProjectIdentityBody,
    any,
    {
      projectId: string;
      identityId: string;
    }
  > {}

async function validate(params: UpdateProjectIdentityRequest) {
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

  const bodySchema = Joi.object({
    openTracking: Joi.boolean(),
    clickTracking: Joi.boolean(),
  });

  const { error: bodyError, value: bodyValue } = bodySchema.validate(
    params.body,
    {
      abortEarly: false,
      stripUnknown: true,
    },
  );

  if (bodyError) {
    throw bodyError;
  }

  return {
    ...params,
    body: bodyValue,
  };
}

async function handle(params: UpdateProjectIdentityRequest) {
  const { currentUser } = params.context.locals;
  const { context } = params;

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

  if (identity.status !== 'success' || !identity.configurationSetName) {
    throw new HttpError('bad_request', 'Identity is not verified');
  }

  const { openTracking, clickTracking } = params.body;
  const events: SetEventType[] = [];
  // If the value is not provided (undefined or null), use the current value
  if (openTracking ?? identity.openTracking) {
    events.push('open');
  }
  if (clickTracking ?? identity.clickTracking) {
    events.push('click');
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
  const snsClient = createSNSServiceClient(
    accessKeyId,
    secretAccessKey,
    region,
  );

  const isValidConfig = await isValidConfiguration(sesClient);
  if (!isValidConfig) {
    throw new HttpError('bad_request', 'Invalid AWS credentials');
  }

  const configSetResponse = await updateConfigurationSetEvent(
    sesClient,
    snsClient,
    identity.configurationSetName,
    events,
  );
  if (!configSetResponse) {
    throw new HttpError('internal_error', 'Failed to update configuration set');
  }

  const redirectDomainRecord = identity.records?.find(
    (record) => record.record.toLowerCase() === 'redirect_domain',
  );
  const newRecords = identity.records || [];

  if (!redirectDomainRecord) {
    // --- Redirect Domain ---
    // Every single links in the email will be masked around this domain
    // to be able to track the clicks, opens, etc.
    // The domain should be in the format of <region>.<domain>
    // Example: ap-south-1.mly.fyi
    const { name: redirectDomain, value: redirectValue } = getRedirectDomain(
      identity.domain,
      region,
    );
    const maskingDomain = await createConfigurationSetTrackingOptions(
      sesClient,
      identity.configurationSetName,
      redirectDomain,
    );

    if (!maskingDomain) {
      throw new HttpError(
        'internal_error',
        'Failed to update tracking options',
      );
    }

    newRecords?.push({
      record: 'REDIRECT_DOMAIN',
      type: 'CNAME',
      status: 'pending',
      ttl: 'Auto',
      name: redirectDomain,
      value: redirectValue,
    });
  }

  const isRedirectDomainVerified = redirectDomainRecord?.status === 'success';
  // --- Redirect Domain ---

  await db
    .update(projectIdentities)
    .set({
      openTracking: openTracking ?? identity.openTracking,
      clickTracking: clickTracking ?? identity.clickTracking,
      // --- Redirect Domain ---
      ...(!isRedirectDomainVerified
        ? {
            status: 'pending',
          }
        : {}),
      records: newRecords,
      // --- Redirect Domain ---
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(projectIdentities.id, identityId),
        eq(projectIdentities.projectId, projectId),
      ),
    );

  return json<UpdateProjectIdentityResponse>({
    status: 'ok',
  });
}

export const PATCH: APIRoute = handler(
  handle satisfies HandleRoute<UpdateProjectIdentityRequest>,
  validate satisfies ValidateRoute<UpdateProjectIdentityRequest>,
  [authenticateUser],
);
