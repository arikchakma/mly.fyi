import { httpGet } from '@/lib/http';
import type { ListProjectIdentityResponse } from '@/pages/api/v1/projects/[projectId]/identities';
import { queryClient } from '@/utils/query-client';
import { useQuery } from '@tanstack/react-query';
import { LoadingMessage } from '../LoadingMessage';
import {
  ArrowUpRight,
  MoreHorizontal,
  RefreshCcw,
  Trash,
  Trash2,
} from 'lucide-react';
import { DateTime } from 'luxon';

type ListProjectIdentitiesProps = {
  projectId: string;
};

export function ListProjectIdentities(props: ListProjectIdentitiesProps) {
  const { projectId } = props;

  const { data } = useQuery(
    {
      queryKey: ['project-identities', projectId],
      queryFn: () => {
        return httpGet<ListProjectIdentityResponse>(
          `/api/v1/projects/${projectId}/identities`,
        );
      },
    },
    queryClient,
  );

  if (!data) {
    return <LoadingMessage message="Loading Project Identities..." />;
  }

  const identities = data.data;

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Indentites</h2>
        <a
          className="rounded-md bg-zinc-800 px-2 py-1 text-sm text-zinc-50"
          href={`/projects/${projectId}/identities/new`}
        >
          <span className="mr-2">+</span> <span>Add Indentity</span>
        </a>
      </div>

      <div className="mt-6">
        {identities.length === 0 && (
          <p className="text-zinc-500">No identities found.</p>
        )}

        {identities.length > 0 && (
          <ul className="grid grid-cols-3">
            {identities.map((identity) => {
              const status = identity.status.replace('-', ' ');
              const lastUpdatedAt = DateTime.fromJSDate(
                new Date(identity.updatedAt),
              ).toRelative();

              return (
                <li key={identity.id}>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className="inline-block rounded-full bg-zinc-200 px-3 py-1 text-xs font-medium capitalize text-black">
                          {status}
                        </span>
                      </div>
                      <span className="flex items-center gap-2">
                        <button className="text-zinc-400 hover:text-zinc-50">
                          <RefreshCcw size={16} />
                        </button>
                        <button className="text-zinc-400 hover:text-zinc-50">
                          <Trash2 size={16} />
                        </button>
                      </span>
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-zinc-200 hover:text-zinc-50">
                      <a
                        href={`/projects/${projectId}/identities/${identity.id}`}
                      >
                        {identity.domain}
                        <ArrowUpRight
                          size={16}
                          className="ml-1 inline-block stroke-[3px]"
                        />
                      </a>
                    </h3>
                    <p className="mt-1 text-sm text-zinc-400">
                      Last updated {lastUpdatedAt}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
