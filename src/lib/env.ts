import { z } from 'astro/zod';

const envVariables = z.object({
  DEV: z.boolean().default(true),
  PORT: z.string().default('3000'),

  APP_URL: z.string(),

  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string(),

  AWS_SES_ACCESS_KEY_ID: z.string(),
  AWS_SES_SECRET_ACCESS_KEY: z.string(),
  AWS_SES_REGION: z.string(),
});

export const env = envVariables.parse(import.meta.env);
export type Env = z.infer<typeof envVariables>;

declare global {
  interface ImportMetaEnv extends Env {}
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}
