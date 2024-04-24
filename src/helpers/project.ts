import { db } from '@/db';
import { type AllowedProjectMemberRole, projectMembers } from '@/db/schema';
import type { Project } from '@/db/types';
import { HttpError } from '@/lib/http-error';
import { createSESServiceClient, isValidConfiguration } from '@/lib/ses';
import { and, eq } from 'drizzle-orm';

export async function requireProjectMember(
  userId: string,
  projectId: string,
  allowedRoles: AllowedProjectMemberRole[] = [],
) {
  const projectMember = await db.query.projectMembers.findFirst({
    where: and(
      eq(projectMembers.userId, userId),
      eq(projectMembers.projectId, projectId),
      eq(projectMembers.status, 'joined'),
    ),
  });

  if (!projectMember) {
    throw new HttpError(
      'forbidden',
      'You must be a project member to perform this action',
    );
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(projectMember.role)) {
    throw new HttpError(
      'forbidden',
      'You are not allowed to perform this action',
    );
  }

  return projectMember;
}

export async function requireProjectConfiguration(project: Project) {
  const { accessKeyId, secretAccessKey, region } = project;

  if (!accessKeyId || !secretAccessKey || !region) {
    throw new HttpError('bad_request', 'Project is not fully configured');
  }

  const sesClient = createSESServiceClient(
    accessKeyId,
    secretAccessKey,
    region,
  );
  if (!isValidConfiguration(sesClient)) {
    throw new HttpError('bad_request', 'Invalid SES configuration');
  }

  return true;
}
