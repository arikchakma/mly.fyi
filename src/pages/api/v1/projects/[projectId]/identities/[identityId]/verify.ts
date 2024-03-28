import { db } from '@/db';
import {
  MatchRecordStatus,
  type ProjectIdentityRecord,
  projectIdentities,
  projects,
} from '@/db/schema';
import { requireProjectMember } from '@/helpers/project';
import {
  getDomainDkimVerificationStatus,
  getMailFromDomainVerificationStatus,
  getRedirectDomain,
  verifyRedirectDomain,
} from '@/lib/domain';
import {
  type HandleRoute,
  type RouteParams,
  type ValidateRoute,
  handler,
} from '@/lib/handler';
import { HttpError } from '@/lib/http-error';
import { createSNSServiceClient } from '@/lib/notification';
import { json } from '@/lib/response';
import {
  DEFAULT_SES_REGION,
  createSESServiceClient,
  isValidConfiguration,
} from '@/lib/ses';
import type { CustomMailFromStatus } from '@aws-sdk/client-ses';
import type { APIRoute } from 'astro';
import { and, eq } from 'drizzle-orm';
import Joi from 'joi';

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

  if (identity.type !== 'domain' || !identity.domain) {
    throw new HttpError('bad_request', 'Identity is not a domain');
  }

  const { accessKeyId, secretAccessKey } = project;
  if (!accessKeyId || !secretAccessKey) {
    throw new HttpError('bad_request', 'Project does not have AWS credentials');
  }

  const sesClient = createSESServiceClient(accessKeyId, secretAccessKey);

  const isValidConfig = await isValidConfiguration(sesClient);
  if (!isValidConfig) {
    throw new HttpError('bad_request', 'Invalid AWS credentials');
  }

  const { domain, mailFromDomain, openTracking, clickTracking } = identity;
  const dkimStatus = await getDomainDkimVerificationStatus(sesClient, domain!);
  if (!dkimStatus) {
    throw new HttpError('not_found', 'DKIM status not found');
  }

  let mailFromDomainStatus: CustomMailFromStatus | undefined;

  if (mailFromDomain) {
    mailFromDomainStatus = await getMailFromDomainVerificationStatus(
      sesClient,
      domain!,
    );

    if (!mailFromDomainStatus) {
      throw new HttpError('not_found', 'Mail from domain not found');
    }
  }

  let redirectDomainStatus: CustomMailFromStatus | undefined;
  if (openTracking || clickTracking) {
    const { name: redirectDomain, value: redirectValue } = getRedirectDomain(
      domain,
      project.region || DEFAULT_SES_REGION,
    );
    redirectDomainStatus = (await verifyRedirectDomain(
      redirectDomain,
      redirectValue,
    ))
      ? 'Success'
      : 'Failed';
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

    if (r.record.toLowerCase() === 'redirect_domain' && redirectDomainStatus) {
      r.status = MatchRecordStatus[redirectDomainStatus];
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
      updatedAt: new Date(),
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
