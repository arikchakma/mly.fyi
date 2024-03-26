import type { APIContext } from 'astro';
import { HttpError } from './http-error';
import { db } from '@/db';
import { projectApiKeys } from '@/db/schema';
import { increment } from '@/utils/database';
import { eq } from 'drizzle-orm';

const MLY_HEADER_API_KEY = 'X-Mly-Api-Key';

export async function authenticateApiKey(content: APIContext) {
  const apiKeyValue = content.request.headers.get(MLY_HEADER_API_KEY);
  console.log('-'.repeat(20));
  console.log('API Key Value:', apiKeyValue);
  console.log('-'.repeat(20));
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
