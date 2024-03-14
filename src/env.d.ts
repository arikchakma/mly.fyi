/// <reference types="astro/client" />

interface ImportMetaEnv {
  AWS_SES_ACCESS_KEY_ID: string;
  AWS_SES_SECRET_ACCESS_KEY: string;
  AWS_SES_REGION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
