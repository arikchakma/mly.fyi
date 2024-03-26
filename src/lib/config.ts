export const serverConfig = {
  appUrl: import.meta.env.PUBLIC_APP_URL,
  isDev: import.meta.env.Dev === true,
  jwt: {
    secret: import.meta.env.JWT_SECRET,
    expiresIn: import.meta.env.JWT_EXPIRES_IN,
  },
  ses: {
    sesEndpointOverrideUrl: import.meta.env.AWS_SES_ENDPOINT_OVERRIDE_URL,
  },
} as const;
