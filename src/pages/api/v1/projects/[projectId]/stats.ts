import { db } from '@/db';
import { emailLogEvents, emailLogs, projects } from '@/db/schema';
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
import { and, count, countDistinct, eq, isNotNull } from 'drizzle-orm';
import Joi from 'joi';

export interface GetProjectStatsResponse {
  totalEmailsSent: number;
  totalEmailsOpened: number;
  totalEmailsClicked: number;
  totalEmailsBounced: number;
  totalEmailsMarkedAsSpam: number;
}

export interface GetProjectStatsRequest
  extends RouteParams<
    any,
    any,
    {
      projectId: string;
    }
  > {}

async function validate(params: GetProjectStatsRequest) {
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

  return params;
}

async function handle(params: GetProjectStatsRequest) {
  const { user: currentUser, context } = params;

  if (!currentUser) {
    throw new HttpError('unauthorized', 'Unauthorized');
  }

  const { projectId } = context.params;
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });

  if (!project) {
    throw new HttpError('not_found', 'Project not found');
  }

  await requireProjectMember(currentUser.id, projectId);

  const totalEmailsSent = await db
    .select({ count: countDistinct(emailLogEvents.emailLogId) })
    .from(emailLogEvents)
    .where(
      and(
        eq(emailLogEvents.projectId, projectId),
        eq(emailLogEvents.type, 'sent'),
      ),
    );

  const totalEmailsOpened = await db
    .select({ count: countDistinct(emailLogEvents.emailLogId) })
    .from(emailLogEvents)
    .where(
      and(
        eq(emailLogEvents.projectId, projectId),
        eq(emailLogEvents.type, 'opened'),
      ),
    );

  const totalEmailsClicked = await db
    .select({ count: countDistinct(emailLogEvents.emailLogId) })
    .from(emailLogEvents)
    .where(
      and(
        eq(emailLogEvents.projectId, projectId),
        eq(emailLogEvents.type, 'clicked'),
      ),
    );

  const totalEmailsBounced = await db
    .select({ count: countDistinct(emailLogEvents.emailLogId) })
    .from(emailLogEvents)
    .where(
      and(
        eq(emailLogEvents.projectId, projectId),
        eq(emailLogEvents.type, 'bounced'),
      ),
    );

  const totalEmailsMarkedAsSpam = await db
    .select({ count: count(emailLogEvents.id) })
    .from(emailLogEvents)
    .where(
      and(
        eq(emailLogEvents.projectId, projectId),
        eq(emailLogEvents.type, 'complained'),
      ),
    );

  return json<GetProjectStatsResponse>({
    totalEmailsSent: totalEmailsSent?.[0]?.count || 0,
    totalEmailsOpened: totalEmailsOpened?.[0]?.count || 0,
    totalEmailsClicked: totalEmailsClicked?.[0]?.count || 0,
    totalEmailsBounced: totalEmailsBounced?.[0]?.count || 0,
    totalEmailsMarkedAsSpam: totalEmailsMarkedAsSpam?.[0]?.count || 0,
  });
}

export const GET: APIRoute = handler(
  handle satisfies HandleRoute<GetProjectStatsRequest>,
  validate satisfies ValidateRoute<GetProjectStatsRequest>,
  {
    isProtected: true,
  },
);
