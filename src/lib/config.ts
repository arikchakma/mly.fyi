import { env } from './env';

export const config = {
  isDev: env.DEV,
  appUrl: env.APP_URL,
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
  },
} as const;
