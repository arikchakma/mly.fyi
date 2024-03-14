import type { InferSelectModel } from 'drizzle-orm';
import { users } from './schema/users.ts';

export type User = InferSelectModel<typeof users>;
