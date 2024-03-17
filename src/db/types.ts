import type { InferSelectModel } from 'drizzle-orm';
import { user } from './schema/user.ts';

export type User = InferSelectModel<typeof user>;
