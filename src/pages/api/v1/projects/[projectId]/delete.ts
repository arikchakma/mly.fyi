import { db } from '@/db';
import { projectIdentities, projectStats, projects } from '@/db/schema';
import {
  requireProjectConfiguration,
  requireProjectMember,
} from '@/helpers/project';
import { runPromisesInBatchSequentially } from '@/helpers/promise';
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
import { json } from '@/lib/response';
import { createSESServiceClient } from '@/lib/ses';
import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import Joi from 'joi';

export interface DeleteProjectResponse {
  status: 'ok';
}

export type DeleteProjectQuery = {
  mode: 'strict' | 'soft';
};

export type DeleteProjectBody = {};

export interface DeleteProjectRequest
  extends RouteParams<
    DeleteProjectBody,
    DeleteProjectQuery,
    {
      projectId: string;
    }
  > {}

async function validate(params: DeleteProjectRequest) {
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

async function handle(params: DeleteProjectRequest) {
  const { projectId } = params.context.params;
  const { currentUserId } = params.context.locals;
  const { mode = 'soft' } = params.query;

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });

  if (!project) {
    throw new HttpError('not_found', 'Project not found');
  }

  await requireProjectMember(currentUserId!, projectId, ['admin']);

  const identities = await db.query.projectIdentities.findMany({
    where: eq(projectIdentities.projectId, projectId),
  });
  if (identities.length > 0) {
    await requireProjectConfiguration(project);

    const { accessKeyId, secretAccessKey, region } = project;
    const sesClient = createSESServiceClient(
      accessKeyId!,
      secretAccessKey!,
      region!,
    );

    if (mode === 'strict') {
      await runPromisesInBatchSequentially(
        identities
          .filter((identity) => identity.domain)
          .map((identitiy) => {
            return deleteIdentity(sesClient, identitiy.domain!);
          }),
        5,
        true,
      );
    }
    await runPromisesInBatchSequentially(
      identities
        .filter((identity) => identity.configurationSetName)
        .map((identity) => {
          return deleteConfigurationSet(
            sesClient,
            identity.configurationSetName!,
          );
        }),
      5,
      true,
    );
  }

  await db.delete(projects).where(eq(projects.id, projectId));

  return json<DeleteProjectResponse>({
    status: 'ok',
  });
}

export const DELETE: APIRoute = handler(
  handle satisfies HandleRoute<DeleteProjectRequest>,
  validate satisfies ValidateRoute<DeleteProjectRequest>,
  [authenticateUser],
);
