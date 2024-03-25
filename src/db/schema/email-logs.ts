import { sql } from 'drizzle-orm';
import { text, sqliteTable, integer, index } from 'drizzle-orm/sqlite-core';

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

export const emailLogs = sqliteTable(
  'email_logs',
  {
    id: text('id').unique().primaryKey(),
    messageId: text('message_id').notNull(),
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
  (emails) => ({}),
);

export const emailEvents = sqliteTable(
  'email_events',
  {
    id: text('id').unique().primaryKey(),
    emailId: text('email_id')
      .notNull()
      .references(() => emailLogs.id),
    email: text('email').notNull(),
    type: text('type', {
      enum: allowedEmailLogStatus,
    }).notNull(),
    timestamp: integer('timestamp', { mode: 'timestamp' })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (emailEvents) => ({}),
);
