import { db } from '@/db';
import { projectMembers, type AllowedMemberRoles } from '@/db/schema';
import { HttpError } from '@/lib/http-error';
import { and, eq } from 'drizzle-orm';

export async function requireProjectMember(
  userId: string,
  projectId: string,
  allowedRoles: AllowedMemberRoles[] = [],
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
