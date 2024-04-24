import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

const isProduction = process.env.NODE_ENV === 'production';
const sqlite = new Database(
  isProduction ? '/data/db.sqlite3' : './data/db.sqlite3',
);

export const db = drizzle(sqlite, {
  schema,
  logger: !isProduction,
});
