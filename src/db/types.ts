import type { InferSelectModel } from 'drizzle-orm';
import type {
  emailLogEvents,
  emailLogs,
  projectApiKeys,
  projectIdentities,
  projectMembers,
  projects,
  users,
} from './schema';

export type * from './schema';
export type User = InferSelectModel<typeof users>;
export type EmailLog = InferSelectModel<typeof emailLogs>;
export type EmailLogEvent = InferSelectModel<typeof emailLogEvents>;
export type Project = InferSelectModel<typeof projects>;
export type ProjectMember = InferSelectModel<typeof projectMembers>;
export type ProjectIdentity = InferSelectModel<typeof projectIdentities>;
export type ProjectApiKey = InferSelectModel<typeof projectApiKeys>;
