import { db } from '@/db';
import {
  type AllowedProjectMemberRole,
  type AllowedProjectMemberStatus,
  projectMembers,
  projects,
} from '@/db/schema';
import type { Project } from '@/db/types';
import {
  type HandleRoute,
  type RouteParams,
  type ValidateRoute,
  handler,
} from '@/lib/handler';
import { HttpError } from '@/lib/http-error';
import { json } from '@/lib/response';
import type { APIRoute } from 'astro';
import { and, eq, inArray, or } from 'drizzle-orm';

export interface ListProjectsResponse
  extends Pick<Project, 'id' | 'name' | 'url'> {
  memberId: string;
  role: AllowedProjectMemberRole;
  status: AllowedProjectMemberStatus;
}

export interface ListProjectsRequest extends RouteParams {}

async function validate(params: ListProjectsRequest) {
  return params;
}

async function handle(params: ListProjectsRequest) {
  const { currentUser } = params.context.locals;
  if (!currentUser) {
    throw new HttpError('unauthorized', 'Unauthorized');
  }

  const associatedMembers = await db.query.projectMembers.findMany({
    where: and(
      or(
        eq(projectMembers.userId, currentUser.id),
        eq(projectMembers.invitedEmail, currentUser.email),
      ),
      inArray(projectMembers.status, ['joined', 'invited']),
    ),
    columns: {
      id: true,
      status: true,
      projectId: true,
      role: true,
    },
  });

  const projectIds = associatedMembers.map((member) => member.projectId);

  let allProjects: {
    id: string;
    name: string;
    url: string;
  }[] = [];

  if (projectIds.length > 0) {
    allProjects = await db.query.projects.findMany({
      where: inArray(projects.id, projectIds),
      columns: {
        id: true,
        name: true,
        url: true,
      },
    });
  }

  const enrichedProjects: ListProjectsResponse[] = [];
  for (const project of allProjects) {
    const projectMember = associatedMembers.find(
      (pm) => pm.projectId === project.id,
    );
    if (!projectMember) {
      continue;
    }

    enrichedProjects.push({
      ...project,
      memberId: projectMember.id,
      role: projectMember.role,
      status: projectMember.status,
    });
  }

  return json<ListProjectsResponse[]>(enrichedProjects);
}

export const GET: APIRoute = handler(
  handle satisfies HandleRoute<ListProjectsRequest>,
  validate satisfies ValidateRoute<ListProjectsRequest>,
  {
    isProtected: true,
  },
);
