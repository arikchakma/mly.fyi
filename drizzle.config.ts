import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  verbose: true,
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  driver: 'better-sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
