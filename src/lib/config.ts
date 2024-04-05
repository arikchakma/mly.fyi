import '@/lib/server-only';

function getEnvVariable(name: string): string {
  return import.meta.env[name] ?? process.env[name];
}

export const serverConfig = {
  appUrl: getEnvVariable('PUBLIC_APP_URL'),
  isDev: getEnvVariable('Dev') === 'true',
  jwt: {
    secret: getEnvVariable('JWT_SECRET'),
    expiresIn: getEnvVariable('JWT_EXPIRES_IN'),
  },
  ses: {
    sesEndpointOverrideUrl: getEnvVariable('AWS_SES_ENDPOINT_OVERRIDE_URL'),
  },
  redis: {
    url: getEnvVariable('REDIS_URL'),
  },
} as const;
