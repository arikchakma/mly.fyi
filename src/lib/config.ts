export const config = {
  isDev: import.meta.env.DEV,
  appUrl: import.meta.env.APP_URL || 'http://localhost:3000',
  jwt: {
    secret: import.meta.env.JWT_SECRET || 'secret',
    expiresIn: import.meta.env.JWT_EXPIRES_IN || '90d',
  },
} as const;
