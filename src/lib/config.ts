import '@/lib/server-only';

function getEnvVariable(name: string): string {
  return import.meta.env[name] ?? process.env[name];
}

export const serverConfig = {
  appUrl: getEnvVariable('PUBLIC_APP_URL'),
  isDev: getEnvVariable('DEV') as unknown as boolean,
  databaseUrl: getEnvVariable('DATABASE_URL'),
  jwt: {
    secret: getEnvVariable('JWT_SECRET'),
    expiresIn: getEnvVariable('JWT_EXPIRES_IN'),
  },
  ses: {
    accessKeyId: getEnvVariable('AWS_SES_ACCESS_KEY_ID'),
    secretAccessKey: getEnvVariable('AWS_SES_SECRET_ACCESS_KEY'),
    region: getEnvVariable('AWS_SES_REGION'),
    sesEndpointOverrideUrl: getEnvVariable('AWS_SES_ENDPOINT_OVERRIDE_URL'),
    fromEmail: getEnvVariable('AWS_SES_FROM_EMAIL'),
  },
  redis: {
    url: getEnvVariable('REDIS_URL'),
  },
} as const;
