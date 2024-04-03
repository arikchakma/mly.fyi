import { db } from '@/db';
import { emailLogEvents, projects } from '@/db/schema';
import { requireProjectMember } from '@/helpers/project';
import {
  type HandleRoute,
  type RouteParams,
  type ValidateRoute,
  handler,
} from '@/lib/handler';
import { HttpError } from '@/lib/http-error';
import { json } from '@/lib/response';
import { getAllDatesBetween } from '@/utils/date';
import type { APIRoute } from 'astro';
import { and, asc, countDistinct, eq, sql } from 'drizzle-orm';
import Joi from 'joi';
import { DateTime } from 'luxon';

type ProjectStat = {
  date: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  complained: number;
};

export interface GetProjectStatsResponse {
  stats: ProjectStat[];
  total: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    complained: number;
  };
}

export interface GetProjectStatsQuery {
  days: number;
}

export interface GetProjectStatsRequest
  extends RouteParams<
    any,
    GetProjectStatsQuery,
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

  const querySchema = Joi.object({
    days: Joi.number().min(1).max(365).default(10),
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

  const { days } = params.query;

  const from = DateTime.now().minus({ days: days - 1 });
  const to = DateTime.now();

  const stats = await db
    .select({
      // TODO: Implement timezone support
      // date: sql<string>`strftime('%Y-%m-%d', datetime(timestamp, 'unixepoch', 'localtime', '+00:00')) AS date`,
      date: sql<string>`strftime('%Y-%m-%d', datetime(timestamp, 'unixepoch', 'localtime')) AS date`,
      sent: countDistinct(
        sql`CASE WHEN type = 'sent' THEN email_log_id ELSE NULL END`,
      ),
      delivered: countDistinct(
        sql`CASE WHEN type = 'delivered' THEN email_log_id ELSE NULL END`,
      ),
      opened: countDistinct(
        sql`CASE WHEN type = 'opened' THEN email_log_id ELSE NULL END`,
      ),
      clicked: countDistinct(
        sql`CASE WHEN type = 'clicked' THEN email_log_id ELSE NULL END`,
      ),
      bounced: countDistinct(
        sql`CASE WHEN type = 'bounced' THEN email_log_id ELSE NULL END`,
      ),
      complained: countDistinct(
        sql`CASE WHEN type = 'complained' THEN email_log_id ELSE NULL END`,
      ),
    })
    .from(emailLogEvents)
    .where(
      and(
        eq(emailLogEvents.projectId, projectId),
        sql`"timestamp" >= ${from.toMillis() / 1000}`,
        sql`"timestamp" <= ${to.toMillis() / 1000}`,
      ),
    )
    .groupBy(sql`date`)
    .orderBy(asc(sql`date`));

  const enrichedStats = getAllDatesBetween(from, to).map((date) => {
    const stat = stats.find((s) => s.date === date);

    return {
      date,
      sent: stat?.sent || 0,
      delivered: stat?.delivered || 0,
      opened: stat?.opened || 0,
      clicked: stat?.clicked || 0,
      bounced: stat?.bounced || 0,
      complained: stat?.complained || 0,
    };
  });

  const total = enrichedStats.reduce(
    (acc, stat) => {
      acc.sent += stat.sent;
      acc.delivered += stat.delivered;
      acc.opened += stat.opened;
      acc.clicked += stat.clicked;
      acc.bounced += stat.bounced;
      acc.complained += stat.complained;
      return acc;
    },
    {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      complained: 0,
    },
  );

  return json<GetProjectStatsResponse>({
    stats: enrichedStats,
    total,
  });
}

export const GET: APIRoute = handler(
  handle satisfies HandleRoute<GetProjectStatsRequest>,
  validate satisfies ValidateRoute<GetProjectStatsRequest>,
  {
    isProtected: true,
  },
);
