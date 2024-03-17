export const serverConfig = {
  jwt: {
    secret: import.meta.env.JWT_SECRET,
    expiresIn: import.meta.env.JWT_EXPIRES_IN,
  },
} as const;
