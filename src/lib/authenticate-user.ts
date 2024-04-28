import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { MiddlewareRoute } from './handler';
import { HttpError } from './http-error';
import { decodeToken, readTokenCookie } from './jwt';

export const authenticateUser: MiddlewareRoute = async (params) => {
  const { context } = params;

  const token = readTokenCookie(context);
  if (!token) {
    throw new HttpError('unauthorized', 'Unauthorized');
  }

  const payload = decodeToken(token);
  const user = await db.query.users.findFirst({
    where: eq(users.id, payload.id),
  });

  if (!user) {
    throw new HttpError('unauthorized', 'Unauthorized');
  }

  if (!user.isEnabled || !user.verifiedAt) {
    throw new HttpError('bad_request', 'User not verified');
  }

  context.locals.currentUser = user;
  context.locals.currentUserId = user.id;

  return params;
};
