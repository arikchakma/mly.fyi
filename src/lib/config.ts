export const serverConfig = {
  appUrl: import.meta.env.PUBLIC_APP_URL,
  isDev: import.meta.env.Dev === true,
  jwt: {
    secret: import.meta.env.JWT_SECRET,
    expiresIn: import.meta.env.JWT_EXPIRES_IN,
  },
  ses: {
    region: import.meta.env.AWS_SES_REGION,
    accessKeyId: import.meta.env.AWS_SES_ACCESS_KEY,
    secretAccessKey: import.meta.env.AWS_SES_SECRET_ACCESS_KEY,
    fromEmail: import.meta.env.AWS_SES_FROM_EMAIL,
    sesEndpointOverrideUrl: import.meta.env.AWS_SES_ENDPOINT_OVERRIDE_URL,
  },
} as const;
