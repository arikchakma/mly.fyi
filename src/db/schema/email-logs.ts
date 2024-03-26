import { sql } from 'drizzle-orm';
import { text, sqliteTable, integer, index } from 'drizzle-orm/sqlite-core';
import { projectApiKeys, projects } from './projects';

export const allowedEmailLogStatus = [
  'sent',
  'delivered',
  'opened',
  'clicked',
  'soft_bounced',
  'bounced',
  'complained',
  'error',
] as const;

export const emailLogs = sqliteTable('email_logs', {
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
});

export const emailLogEvents = sqliteTable('email_log_events', {
  id: text('id').unique().primaryKey(),
  emailLogId: text('email_log_id')
    .notNull()
    .references(() => emailLogs.id),
  email: text('email').notNull(),
  type: text('type', {
    enum: allowedEmailLogStatus,
  }).notNull(),
  timestamp: integer('timestamp', { mode: 'timestamp' })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
