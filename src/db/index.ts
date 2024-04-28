import { serverConfig } from '@/lib/config';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

if (!serverConfig.databaseUrl) {
  throw new Error('DATABASE_URL is missing');
}

const sqlite = new Database(serverConfig.databaseUrl);

export const db = drizzle(sqlite, {
  schema,
  logger: serverConfig.isDev,
});
