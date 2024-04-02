import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

export const sqlite = new Database(
  process.env.PROD ? '/data/db.sqlite3' : './data/db.sqlite3',
);

export const db = drizzle(sqlite, { schema, logger: true });
