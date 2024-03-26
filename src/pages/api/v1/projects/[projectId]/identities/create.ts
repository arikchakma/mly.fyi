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
  allowedIdentityTypes,
  projectIdentities,
  projects,
  type ProjectIdentityRecord,
} from '@/db/schema';
import { newId } from '@/lib/new-id';
import { requireProjectMember } from '@/helpers/project';
import { and, eq } from 'drizzle-orm';
import { HttpError } from '@/lib/http-error';
import { addMailFromDomain, verifyDomainDkim } from '@/lib/domain';
import { serverConfig } from '@/lib/config';
import { createConfigurationSet } from '@/lib/configuration-set';
import { createSESServiceClient, isValidConfiguration } from '@/lib/ses';
import { createSNSServiceClient } from '@/lib/notification';

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
  mailFromDomain?: string;
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
      then: Joi.string().required(),
      otherwise: Joi.forbidden(),
    }),
    mailFromDomain: Joi.string().when('type', {
      is: 'domain',
      then: Joi.string().allow('').optional(),
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
  const { body, userId, user } = params;
  const { projectId } = params.context.params;
  const { type } = body;

  if (type === 'email') {
    throw new HttpError(
      'not_implemented',
      'Email identities are not yet supported',
    );
  }

  const { domain, mailFromDomain } = body;

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });

  if (!project) {
    throw new HttpError('not_found', 'Project not found');
  }

  await requireProjectMember(userId!, projectId, ['admin']);

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

  const { accessKeyId, secretAccessKey } = project;
  if (!accessKeyId || !secretAccessKey) {
    throw new HttpError('bad_request', 'Project does not have AWS credentials');
  }

  const sesClient = createSESServiceClient(accessKeyId, secretAccessKey);
  const snsClient = createSNSServiceClient(accessKeyId, secretAccessKey);

  const isValidConfig = await isValidConfiguration(sesClient);
  if (!isValidConfig) {
    throw new HttpError('bad_request', 'Invalid AWS credentials');
  }

  const projectIdentityId = newId('projectIdentity');

  const status = await db.transaction(async (tx) => {
    await tx.insert(projectIdentities).values({
      id: projectIdentityId,
      projectId,
      creatorId: userId!,
      type,
      domain,
      mailFromDomain,
      status: 'not-started',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const dkimTokens = await verifyDomainDkim(sesClient, domain);
    if (dkimTokens.length === 0) {
      tx.rollback();
      return false;
    }

    if (mailFromDomain) {
      const result = await addMailFromDomain(sesClient, domain, mailFromDomain);
      if (!result) {
        tx.rollback();
        return false;
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

    const sesRegion = serverConfig.ses.region;
    if (mailFromDomain) {
      // Sender Policy Framework (SPF) records
      // it will let Amazon SES send emails on your behalf
      records.push({
        record: 'SPF',
        name: mailFromDomain,
        type: 'MX',
        status: 'not-started',
        // For feedbacks like bounces and complaints
        value: `feedback-smtp.${sesRegion}.amazonses.com`,
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

    const configurationSetName = await createConfigurationSet(
      sesClient,
      snsClient,
    );
    if (!configurationSetName) {
      tx.rollback();
      return false;
    }

    await tx
      .update(projectIdentities)
      .set({
        records,
        configurationSetName,
        updatedAt: new Date(),
      })
      .where(eq(projectIdentities.id, projectIdentityId));

    return true;
  });

  if (!status) {
    throw new HttpError('internal_error', 'Failed to add domain identity');
  }

  return json<CreateProjectIdentityResponse>({
    identityId: projectIdentityId,
  });
}

export const POST: APIRoute = handler(
  handle satisfies HandleRoute<CreateProjectIdentityRequest>,
  validate satisfies ValidateRoute<CreateProjectIdentityRequest>,
  {
    isProtected: true,
  },
);
