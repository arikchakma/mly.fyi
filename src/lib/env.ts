import { z } from 'astro/zod';

const envVariables = z.object({
  PORT: z.string().default('3000'),
  NODE_ENV: z.string().default('development'),

  APP_URL: z.string().default('http://localhost:3000'),

  AWS_SES_ACCESS_KEY_ID: z.string(),
  AWS_SES_SECRET_ACCESS_KEY: z.string(),
  AWS_SES_REGION: z.string(),
});

export type Env = z.infer<typeof envVariables>;
