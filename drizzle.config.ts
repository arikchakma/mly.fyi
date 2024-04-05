import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  driver: 'better-sqlite',
  dbCredentials: {
    url:
      process.env.NODE_ENV === 'production'
        ? '/data/db.sqlite3'
        : './data/db.sqlite3',
  },
});
