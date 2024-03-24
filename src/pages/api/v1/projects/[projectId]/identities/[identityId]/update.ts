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
  type SetEventType,
} from '@/lib/configuration-set';

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

  return {
    ...params,
    body: bodyValue,
  };
}

async function handle(params: UpdateProjectIdentityRequest) {
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

  await requireProjectMember(currentUser.id, projectId);

  const identity = await db.query.projectIdentities.findFirst({
    where: and(
      eq(projectIdentities.id, identityId),
      eq(projectIdentities.projectId, projectId),
    ),
  });

  if (!identity) {
    throw new HttpError('not_found', 'Identity not found');
  }

  if (identity.type !== 'domain') {
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

  const configSetResponse = await updateConfigurationSetEvent(
    identity.configurationSetName,
    events,
  );
  if (!configSetResponse) {
    throw new HttpError('internal_error', 'Failed to update configuration set');
  }

  await db
    .update(projectIdentities)
    .set({
      openTracking: openTracking ?? identity.openTracking,
      clickTracking: clickTracking ?? identity.clickTracking,
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
  {
    isProtected: true,
  },
);
