import type { ListProjectIdentityResponse } from '../../pages/api/v1/projects/[projectId]/identities/index';
import { DateTime } from 'luxon';
import { ArrowUpRight, RefreshCcw, Trash2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { queryClient } from '@/utils/query-client';
import { httpPost } from '@/lib/http';
import { toast } from 'sonner';

type ProjectIdentityItemProps = {
  projectId: string;
  identity: ListProjectIdentityResponse['data'][number];
};

export function ProjectIdentityItem(props: ProjectIdentityItemProps) {
  const { projectId, identity } = props;

  const status = identity.status.replace('-', ' ');
  const lastUpdatedAt = DateTime.fromJSDate(
    new Date(identity.updatedAt),
  ).toRelative();

  const triggerVerifyDomain = useMutation(
    {
      mutationKey: ['project-identity', projectId, identity.id, 'verify'],
      mutationFn: () => {
        return httpPost(
          `/api/v1/projects/${projectId}/identities/${identity.id}/verify`,
          {},
        );
      },
    },
    queryClient,
  );

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="inline-block rounded-full bg-zinc-200 px-3 py-1 text-xs font-medium capitalize text-black">
            {status}
          </span>
        </div>
        <span className="flex items-center gap-2">
          <button
            className="text-zinc-400 hover:text-zinc-50"
            onClick={() => {
              toast.promise(triggerVerifyDomain.mutateAsync(), {
                loading: 'Refreshing Identity status..',
                success: 'Refreshed Identity status',
                error: (err) => {
                  return err?.message || 'Something went wrong';
                },
              });
            }}
          >
            <RefreshCcw size={16} />
          </button>
          <button className="text-zinc-400 hover:text-zinc-50">
            <Trash2 size={16} />
          </button>
        </span>
      </div>
      <h3 className="mt-4 text-lg font-semibold text-zinc-200 hover:text-zinc-50">
        <a href={`/projects/${projectId}/identities/${identity.id}`}>
          {identity.domain}
          <ArrowUpRight size={16} className="ml-1 inline-block stroke-[3px]" />
        </a>
      </h3>
      <p className="mt-1 text-sm text-zinc-400">Last updated {lastUpdatedAt}</p>
    </div>
  );
}
