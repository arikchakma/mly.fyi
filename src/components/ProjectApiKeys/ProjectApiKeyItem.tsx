import React from 'react';
import { DateTime } from 'luxon';
import { ArrowUpRight, Trash2 } from 'lucide-react';
import type { ListProjectApiKeysResponse } from '../../pages/api/v1/projects/[projectId]/keys/index';
import { DeleteApiKey } from './DeleteApiKey';

type ProjectApiKeyItemProps = {
  projectId: string;
  apiKey: ListProjectApiKeysResponse['data'][number];
};

export function ProjectApiKeyItem(props: ProjectApiKeyItemProps) {
  const { projectId, apiKey } = props;

  const status = apiKey.status;
  const lastUsedAt =
    (apiKey.lastUsedAt &&
      DateTime.fromJSDate(new Date(apiKey.lastUsedAt)).toRelative()) ||
    'Never';

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="inline-block rounded-full bg-zinc-200 px-3 py-1 text-xs font-medium capitalize text-black">
            {status}
          </span>
        </div>
        <span className="flex items-center gap-2">
          <DeleteApiKey
            projectId={projectId}
            apiKeyId={apiKey.id}
            apiKeyName={apiKey.name}
          />
        </span>
      </div>
      <h3 className="mt-4 text-lg font-semibold text-zinc-200 hover:text-zinc-50">
        <a href={`/projects/${projectId}/keys/${apiKey.id}`}>
          {apiKey.name}
          <ArrowUpRight size={16} className="ml-1 inline-block stroke-[3px]" />
        </a>
      </h3>
      <p className="mt-1 text-sm text-zinc-400">Last used {lastUsedAt}</p>
    </div>
  );
}
