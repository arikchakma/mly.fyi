import type { APIContext, AstroGlobal } from 'astro';
import { api } from './api.ts';
import type { ListProjectsResponse } from '@/pages/api/v1/projects';
import type { GetProjectResponse } from '@/pages/api/v1/projects/[projectId]/index.ts';

export function projectApi(context: APIContext | AstroGlobal) {
  return {
    listProjects: () => {
      return api(context).get<ListProjectsResponse[]>(`/api/v1/projects`);
    },
    getProject: (projectId: string) => {
      return api(context).get<GetProjectResponse>(
        `/api/v1/projects/${projectId}`,
      );
    },
  };
}
