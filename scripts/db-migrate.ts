import 'dotenv/config';

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

console.log('Migrating database...');

const sqlite = new Database(
  process.env.NODE_ENV === 'production'
    ? '/data/db.sqlite3'
    : './data/db.sqlite3',
);
const db = drizzle(sqlite);

migrate(db, { migrationsFolder: 'drizzle' });
sqlite.close();

console.log('Database migrated.');
