import 'dotenv/config';

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

console.log('Migrating database...');
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing');
}

const sqlite = new Database(process.env.DATABASE_URL);
const db = drizzle(sqlite);

migrate(db, { migrationsFolder: 'drizzle' });
sqlite.close();

console.log('Database migrated.');
