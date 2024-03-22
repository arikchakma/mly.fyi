import type { InferSelectModel } from 'drizzle-orm';
import type {
  emailEvents,
  emailLogs,
  projectIdentities,
  projectMembers,
  projects,
  users,
} from './schema';

export type User = InferSelectModel<typeof users>;
export type EmailLog = InferSelectModel<typeof emailLogs>;
export type EmailEvent = InferSelectModel<typeof emailEvents>;
export type Project = InferSelectModel<typeof projects>;
export type ProjectMember = InferSelectModel<typeof projectMembers>;
export type ProjectIdentity = InferSelectModel<typeof projectIdentities>;
