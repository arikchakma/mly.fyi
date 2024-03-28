import { db } from '@/db';
import { projectApiKeys } from '@/db/schema';
import { increment } from '@/utils/database';
import type { APIContext } from 'astro';
import { eq } from 'drizzle-orm';
import { HttpError } from './http-error';

const MLY_HEADER_API_KEY = 'X-Mly-Api-Key';

export async function authenticateApiKey(content: APIContext) {
  const apiKeyValue = content.request.headers.get(MLY_HEADER_API_KEY);
  if (!apiKeyValue) {
    throw new HttpError('unauthorized', 'Unauthorized');
  }

  const projectApiKey = await db.query.projectApiKeys.findFirst({
    where: eq(projectApiKeys.key, apiKeyValue),
  });
  if (!projectApiKey) {
    throw new HttpError('unauthorized', 'Unauthorized');
  }

  await db
    .update(projectApiKeys)
    .set({
      usageCount: increment(projectApiKeys.usageCount, 1),
      lastUsedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(projectApiKeys.id, projectApiKey.id));

  return projectApiKey;
}
