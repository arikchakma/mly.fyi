import { defineMiddleware } from 'astro:middleware';
import { eq } from 'drizzle-orm';
import { db } from './db/index.ts';
import { users } from './db/schema/users.ts';
import { TOKEN_COOKIE_NAME, decodeToken } from './lib/jwt.ts';
import { logError } from './lib/logger.ts';

export const onRequest = defineMiddleware(async (context, next) => {
  if (context.url.pathname.startsWith('/api')) {
    return next();
  }

  const userAuthToken = context.cookies.get(TOKEN_COOKIE_NAME)?.value;
  if (userAuthToken) {
    const { id } = decodeToken(userAuthToken);
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, id),
        columns: {
          id: true,
          email: true,
          name: true,
        },
      });

      if (!user) {
        context.cookies.delete(TOKEN_COOKIE_NAME);
        return next();
      }

      context.locals.currentUser = user;
      context.locals.currentUserId = user?.id;
    } catch (error) {
      if (!import.meta.env.DEV) {
        context.cookies.delete(TOKEN_COOKIE_NAME);
        return next();
      }

      logError(error);
    }
  }

  return next();
});
