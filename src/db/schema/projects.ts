import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { users } from './users';

export const allowedProjectSetupStatus = [
  'completed',
  'verification-pending',
  'not-started',
] as const;
export type AllowedProjectSetupStatus =
  (typeof allowedProjectSetupStatus)[number];

export const projects = sqliteTable('projects', {
  id: text('id').unique().primaryKey(),
  creatorId: text('creator_id')
    .notNull()
    .references(() => users.id, {
      onDelete: 'cascade',
    }),
  name: text('name').notNull(),
  url: text('url').notNull(),
  timezone: text('timezone').notNull(),
  accessKeyId: text('access_key_id').unique(),
  secretAccessKey: text('secret_access_key').unique(),
  region: text('region'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const allowedProjectMemberRoles = [
  'admin',
  'manager',
  'viewer',
] as const;
export const allowedProjectMemberStatus = [
  'invited',
  'joined',
  'rejected',
] as const;

export type AllowedProjectMemberRole =
  (typeof allowedProjectMemberRoles)[number];
export type AllowedProjectMemberStatus =
  (typeof allowedProjectMemberStatus)[number];

export const projectMembers = sqliteTable('project_members', {
  id: text('id').unique().primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, {
      onDelete: 'cascade',
    }),
  userId: text('user_id').references(() => users.id, {
    onDelete: 'cascade',
  }),
  invitedEmail: text('invited_email').notNull(),
  role: text('role', {
    enum: allowedProjectMemberRoles,
  })
    .notNull()
    .default('viewer'),
  status: text('status', {
    enum: allowedProjectMemberStatus,
  })
    .notNull()
    .default('invited'),
  lastResendInviteAt: integer('last_resend_invite_at', {
    mode: 'timestamp',
  }),
  resendInviteCount: integer('resend_invite_count').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

const allowedIdentityVerificationStatus = [
  'failed',
  'not-started',
  'pending',
  'success',
  'temporary-failure',
] as const;
type AllowedIdentityVerificationStatus =
  (typeof allowedIdentityVerificationStatus)[number];

export enum MatchRecordStatus {
  Success = 'success',
  Pending = 'pending',
  Failed = 'failed',
  NotStarted = 'not-started',
  TemporaryFailure = 'temporary-failure',
}

const allowedIdentityRecord = [
  'DKIM',
  'SPF',
  'DMARC',
  'REDIRECT_DOMAIN',
] as const;
type AllowedIdentityRecord = (typeof allowedIdentityRecord)[number];

export interface ProjectIdentityRecord {
  record: AllowedIdentityRecord;
  name: string;
  type: string;
  ttl?: string | number;
  status: AllowedIdentityVerificationStatus;
  value: string;
  priority?: number;
}

export const allowedIdentityTypes = ['email', 'domain'] as const;
export type AllowedIdentityTypes = (typeof allowedIdentityTypes)[number];

export const projectIdentities = sqliteTable('project_identities', {
  id: text('id').unique().primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, {
      onDelete: 'cascade',
    }),
  creatorId: text('creator_id')
    .notNull()
    .references(() => users.id, {
      onDelete: 'restrict',
    }),
  type: text('type', {
    enum: ['email', 'domain'],
  }).notNull(),
  email: text('email'),
  domain: text('domain'),
  // This is the domain from which the email is sent
  mailFromDomain: text('mail_from_domain'),
  status: text('status', {
    enum: allowedIdentityVerificationStatus,
  })
    .notNull()
    .default('not-started'),
  records: text('records', {
    mode: 'json',
  })
    .$type<ProjectIdentityRecord[]>()
    .default(sql`'[]'`),
  clickTracking: integer('click_tracking', {
    mode: 'boolean',
  })
    .notNull()
    .default(false),
  openTracking: integer('open_tracking', {
    mode: 'boolean',
  })
    .notNull()
    .default(false),
  configurationSetName: text('configuration_set_name'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const allowedProjectApiKeyStatus = ['active', 'inactive'] as const;
export type AllowedProjectApiKeyStatus =
  (typeof allowedProjectApiKeyStatus)[number];

export const projectApiKeys = sqliteTable('project_api_keys', {
  id: text('id').unique().primaryKey(),
  name: text('name').notNull(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, {
      onDelete: 'cascade',
    }),
  creatorId: text('creator_id')
    .notNull()
    .references(() => users.id, {
      onDelete: 'restrict',
    }),
  status: text('status', {
    enum: allowedProjectApiKeyStatus,
  })
    .notNull()
    .default('active'),
  key: text('key').unique().notNull(),
  usageCount: integer('usage_count').default(0),
  lastUsedAt: integer('last_used_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const projectStats = sqliteTable('project_stats', {
  id: text('id').unique().primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, {
      onDelete: 'cascade',
    }),
  date: integer('date').notNull(),
  sent: integer('sent').default(0),
  delivered: integer('delivered').default(0),
  bounced: integer('bounced').default(0),
  opened: integer('opened').default(0),
  clicked: integer('clicked').default(0),
  spamComplaints: integer('spam_complaints').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});
