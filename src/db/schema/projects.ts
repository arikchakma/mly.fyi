import { sql } from 'drizzle-orm';
import { text, sqliteTable, integer } from 'drizzle-orm/sqlite-core';
import { users } from './users';

export const allowedProjectSetupStatus = [
  'completed',
  'verification-pending',
  'not-started',
] as const;
export type AllowedProjectSetupStatus =
  (typeof allowedProjectSetupStatus)[number];

export const projects = sqliteTable(
  'projects',
  {
    id: text('id').unique().primaryKey(),
    creatorId: text('creator_id')
      .notNull()
      .references(() => users.id),
    name: text('name').notNull(),
    url: text('url').notNull(),
    timezone: text('timezone').notNull(),
    apiKey: text('api_key').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (projects) => ({}),
);

const allowedProjectMemberRoles = ['admin', 'manager', 'viewer'] as const;
const allowedProjectMemberStatus = ['invited', 'joined', 'rejected'] as const;

export type AllowedMemberRoles = (typeof allowedProjectMemberRoles)[number];
export type AllowedProjectMemberStatus =
  (typeof allowedProjectMemberStatus)[number];

export const projectMembers = sqliteTable(
  'project_members',
  {
    id: text('id').unique().primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id),
    userId: text('user_id').notNull(),
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
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (projectMembers) => ({}),
);
