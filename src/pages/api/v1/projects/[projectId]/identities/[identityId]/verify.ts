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
import {
  MatchRecordStatus,
  projectIdentities,
  projects,
  type ProjectIdentityRecord,
} from '@/db/schema';
import { requireProjectMember } from '@/helpers/project';
import { and, eq } from 'drizzle-orm';
import { HttpError } from '@/lib/http-error';
import {
  getDomainDkimVerificationStatus,
  getMailFromDomainVerificationStatus,
} from '@/lib/domain';
import type { CustomMailFromStatus } from '@aws-sdk/client-ses';

export interface VerifyProjectIdentityResponse {
  records: ProjectIdentityRecord[];
}

export type VerifyProjectIdentityBody = {};

export interface VerifyProjectIdentityRequest
  extends RouteParams<
    VerifyProjectIdentityBody,
    any,
    {
      projectId: string;
      identityId: string;
    }
  > {}

async function validate(params: VerifyProjectIdentityRequest) {
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

async function handle(params: VerifyProjectIdentityRequest) {
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
    columns: {
      configurationSetName: false,
    },
  });

  if (!identity) {
    throw new HttpError('not_found', 'Identity not found');
  }

  if (identity.type !== 'domain') {
    throw new HttpError('bad_request', 'Identity is not a domain');
  }

  const { domain, mailFromDomain } = identity;
  const dkimStatus = await getDomainDkimVerificationStatus(domain!);
  if (!dkimStatus) {
    throw new HttpError('not_found', 'DKIM status not found');
  }

  let mailFromDomainStatus: CustomMailFromStatus | undefined;

  if (mailFromDomain) {
    mailFromDomainStatus = await getMailFromDomainVerificationStatus(domain!);

    if (!mailFromDomainStatus) {
      throw new HttpError('not_found', 'Mail from domain not found');
    }
  }

  const records = (identity.records || []).map((r) => {
    if (r.record.toLowerCase() === 'dkim') {
      r.status = MatchRecordStatus[dkimStatus];
    }

    if (
      mailFromDomain &&
      mailFromDomainStatus &&
      r.record.toLowerCase() === 'spf'
    ) {
      r.status = MatchRecordStatus[mailFromDomainStatus];
    }

    return r;
  });

  const isVerified = records.every((r) => r.status === 'success');
  const isFailed = records.some((r) => r.status === 'failed');
  const isPending =
    records.some((r) => r.status === 'pending') && !isFailed && !isVerified;

  await db
    .update(projectIdentities)
    .set({
      ...(isVerified ? { status: 'success' } : {}),
      ...(isFailed ? { status: 'failed' } : {}),
      ...(isPending ? { status: 'pending' } : {}),
      records,
    })
    .where(eq(projectIdentities.id, identityId));

  return json<VerifyProjectIdentityResponse>({
    records,
  });
}

export const POST: APIRoute = handler(
  handle satisfies HandleRoute<VerifyProjectIdentityRequest>,
  validate satisfies ValidateRoute<VerifyProjectIdentityRequest>,
  {
    isProtected: true,
  },
);
