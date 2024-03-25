/// <reference types="astro/client" />

interface ImportMetaEnv {
  PUBLIC_APP_URL: string;

  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  AWS_SES_REGION: string;

  AWS_SES_ACCESS_KEY: string;
  AWS_SES_SECRET_ACCESS_KEY: string;
  AWS_SES_FROM_EMAIL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace App {
  interface Locals {
    currentUser:
      | Pick<import('./db/types.ts').User, 'id' | 'email' | 'name'>
      | undefined;
    currentUserId: string | undefined;
  }
}
