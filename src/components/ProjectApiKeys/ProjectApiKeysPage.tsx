import React from 'react';
import type { GetProjectResponse } from '../../pages/api/v1/projects/[projectId]/index.js';

type ProjectApiKeysPageProps = {
  project: GetProjectResponse;
  projectId: string;
};

export function ProjectApiKeysPage(props: ProjectApiKeysPageProps) {
  const { projectId } = props;

  return (
    <div className="mx-auto max-w-3xl py-12">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Keys</h2>
        <a
          className="rounded-md bg-zinc-800 px-2 py-1 text-sm text-zinc-50"
          href={`/projects/${projectId}/keys/new`}
        >
          <span className="mr-2">+</span> <span>Create New Key</span>
        </a>
      </div>
    </div>
  );
}
