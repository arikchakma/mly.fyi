import { db } from '@/db';
import {
  type ProjectIdentityRecord,
  allowedIdentityTypes,
  projectIdentities,
  projects,
} from '@/db/schema';
import {
  requireProjectConfiguration,
  requireProjectMember,
} from '@/helpers/project';
import { authenticateUser } from '@/lib/authenticate-user';
import { createConfigurationSet } from '@/lib/configuration-set';
import {
  addMailFromDomain,
  deleteIdentity,
  verifyDomainDkim,
} from '@/lib/domain';
import {
  type HandleRoute,
  type RouteParams,
  type ValidateRoute,
  handler,
} from '@/lib/handler';
import { HttpError } from '@/lib/http-error';
import { newId } from '@/lib/new-id';
import { createSNSServiceClient } from '@/lib/notification';
import { rateLimitMiddleware } from '@/lib/rate-limit';
import { json, jsonWithRateLimit } from '@/lib/response';
import { createSESServiceClient, isValidConfiguration } from '@/lib/ses';
import { DEFAULT_DISALLOWED_SUBDOMAINS, isSubdomain } from '@/utils/domain';
import type { APIRoute } from 'astro';
import { and, eq } from 'drizzle-orm';
import Joi from 'joi';

export interface CreateProjectIdentityResponse {
  identityId: string;
}

export type EmailIndentity = {
  type: 'email';
  email: string;
};

export type DomainIdentity = {
  type: 'domain';
  domain: string;
  mailFromDomain: string;
};

export type CreateProjectIdentityBody = EmailIndentity | DomainIdentity;

export interface CreateProjectIdentityRequest
  extends RouteParams<
    CreateProjectIdentityBody,
    any,
    {
      projectId: string;
    }
  > {}

async function validate(params: CreateProjectIdentityRequest) {
  const schema = Joi.object({
    type: Joi.string()
      .valid(...allowedIdentityTypes)
      .required(),
    email: Joi.string().when('type', {
      is: 'email',
      then: Joi.string().email().required(),
      otherwise: Joi.forbidden(),
    }),
    domain: Joi.string().when('type', {
      is: 'domain',
      then: Joi.string()
        .trim()
        .lowercase()
        .replace(/^https?:\/\//, '')
        .required(),
      otherwise: Joi.forbidden(),
    }),
    mailFromDomain: Joi.string().when('type', {
      is: 'domain',
      then: Joi.string()
        .trim()
        .lowercase()
        .replace(/^https?:\/\//, '')
        .required(),
      otherwise: Joi.forbidden(),
    }),
  });

  const { error, value } = schema.validate(params.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    throw error;
  }

  return {
    ...params,
    body: value,
  };
}

async function handle(params: CreateProjectIdentityRequest) {
  const { body } = params;
  const { currentUserId } = params.context.locals;
  const { projectId } = params.context.params;
  const { type } = body;

  if (type === 'email') {
    throw new HttpError(
      'not_implemented',
      'Email identities are not yet supported',
    );
  }

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });

  if (!project) {
    throw new HttpError('not_found', 'Project not found');
  }

  await requireProjectMember(currentUserId!, projectId, ['admin', 'manager']);
  await requireProjectConfiguration(project);

  const { domain, mailFromDomain } = body;
  if (
    !isSubdomain(mailFromDomain, domain, [
      ...DEFAULT_DISALLOWED_SUBDOMAINS,
      project?.region!, // Don't allow the region as a subdomain because it's a reserved keyword for the redirect domain
    ])
  ) {
    throw new HttpError(
      'bad_request',
      'Mail From Domain must be a valid subdomain',
    );
  }

  const existingIdentity = await db.query.projectIdentities.findFirst({
    where: and(
      eq(projectIdentities.projectId, projectId),
      eq(projectIdentities.domain, domain),
    ),
  });

  if (existingIdentity) {
    throw new HttpError(
      'bad_request',
      'Domain identity already exists for this project',
    );
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

  const projectIdentityId = newId('projectIdentity');

  await db.insert(projectIdentities).values({
    id: projectIdentityId,
    projectId,
    creatorId: currentUserId!,
    type,
    domain,
    mailFromDomain,
    status: 'not-started',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const dkimTokens = await verifyDomainDkim(sesClient, domain);
  if (dkimTokens.length === 0) {
    await db
      .delete(projectIdentities)
      .where(eq(projectIdentities.id, projectIdentityId));
    throw new HttpError('bad_request', 'Failed to verify domain DKIM');
  }

  if (mailFromDomain) {
    const result = await addMailFromDomain(sesClient, domain, mailFromDomain);
    if (!result) {
      await deleteIdentity(sesClient, domain);
      await db
        .delete(projectIdentities)
        .where(eq(projectIdentities.id, projectIdentityId));
      throw new HttpError('bad_request', 'Failed to add mail from domain');
    }
  }

  const records: ProjectIdentityRecord[] = [];

  // DomainKeys Identified Mail (DKIM) records
  // it will let Amazon SES sign your emails with a private key
  // so that the recipient can verify that the email was sent by you
  dkimTokens.forEach((token) => {
    records.push({
      record: 'DKIM',
      name: `${token}._domainkey.${domain}`,
      type: 'CNAME',
      status: 'not-started',
      value: `${token}.dkim.amazonses.com`,
      ttl: 'Auto',
    });
  });

  if (mailFromDomain) {
    // Sender Policy Framework (SPF) records
    // it will let Amazon SES send emails on your behalf
    records.push({
      record: 'SPF',
      name: mailFromDomain,
      type: 'MX',
      status: 'not-started',
      // For feedbacks like bounces and complaints
      value: `feedback-smtp.${region}.amazonses.com`,
      priority: 10,
      ttl: 'Auto',
    });
    records.push({
      record: 'SPF',
      name: mailFromDomain,
      type: 'TXT',
      status: 'not-started',
      value: '"v=spf1 include:amazonses.com ~all"',
      ttl: 'Auto',
    });
  }

  const configurationSetName = newId('configurationSet');
  const configurationSet = await createConfigurationSet(
    sesClient,
    snsClient,
    configurationSetName,
  );
  if (!configurationSet) {
    await deleteIdentity(sesClient, domain);
    await db
      .delete(projectIdentities)
      .where(eq(projectIdentities.id, projectIdentityId));
    throw new HttpError('bad_request', 'Failed to create configuration set');
  }

  await db
    .update(projectIdentities)
    .set({
      records,
      configurationSetName,
      updatedAt: new Date(),
    })
    .where(eq(projectIdentities.id, projectIdentityId));

  return jsonWithRateLimit(
    json<CreateProjectIdentityResponse>({
      identityId: projectIdentityId,
    }),
    params.context,
  );
}

export const POST: APIRoute = handler(
  handle satisfies HandleRoute<CreateProjectIdentityRequest>,
  validate satisfies ValidateRoute<CreateProjectIdentityRequest>,
  [rateLimitMiddleware(), authenticateUser],
);
