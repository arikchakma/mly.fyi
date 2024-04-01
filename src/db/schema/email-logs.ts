import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { projectApiKeys, projects } from './projects';

export const allowedEmailLogStatus = [
  'queued',
  'sending',
  'sent',
  'delivered',
  'opened',
  'clicked',
  'soft-bounced',
  'bounced',
  'complained',
  'error',
  'rejected',
] as const;
export type AllowedEmailLogStatus = (typeof allowedEmailLogStatus)[number];

export const emailLogs = sqliteTable(
  'email_logs',
  {
    id: text('id').unique().primaryKey(),
    messageId: text('message_id'),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, {
        onDelete: 'no action',
      }),
    apiKeyId: text('api_key_id')
      .notNull()
      .references(() => projectApiKeys.id, {
        onDelete: 'no action',
      }),
    from: text('from').notNull(),
    to: text('to').notNull(),
    replyTo: text('reply_to'),
    subject: text('subject').notNull(),
    text: text('text'),
    html: text('html'),
    status: text('status', {
      enum: allowedEmailLogStatus,
    }).notNull(),
    sendAt: integer('send_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (emailLogs) => {
    return {
      messageIdEmailIndex: index('message_id_email_idx').on(
        emailLogs.messageId,
        emailLogs.to,
      ),
      projectIdIdx: index('project_id_idx').on(emailLogs.projectId),
      emailLogIdProjectIdIdx: index('email_log_id_project_id_idx').on(
        emailLogs.id,
        emailLogs.projectId,
      ),
    };
  },
);

export const emailLogEvents = sqliteTable('email_log_events', {
  id: text('id').unique().primaryKey(),
  emailLogId: text('email_log_id')
    .notNull()
    .references(() => emailLogs.id, {
      onDelete: 'cascade',
    }),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, {
      onDelete: 'no action',
    }),
  email: text('email').notNull(),
  type: text('type', {
    enum: allowedEmailLogStatus,
  }).notNull(),
  rawResponse: text('raw_response'),
  userAgent: text('user_agent'),
  ipAddress: text('ip_address'),
  link: text('link'),
  timestamp: integer('timestamp', { mode: 'timestamp' })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
