import type { ListProjectIdentitiesResponse } from '../../pages/api/v1/projects/[projectId]/identities/index';
import { DateTime } from 'luxon';
import { ArrowUpRight, RefreshCcw, Trash2 } from 'lucide-react';
import { TriggerVerifyIdentity } from './TriggerVerifyIdentity';
import { DeleteIdentity } from './DeleteIdentity';

type ProjectIdentityItemProps = {
  projectId: string;
  identity: ListProjectIdentitiesResponse['data'][number];
};

export function ProjectIdentityItem(props: ProjectIdentityItemProps) {
  const { projectId, identity } = props;

  const status = identity.status.replace('-', ' ');
  const lastUpdatedAt = DateTime.fromJSDate(
    new Date(identity.updatedAt),
  ).toRelative();

  return (
    <div className='rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-4'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-1'>
          <span className='inline-block rounded-full bg-zinc-200 px-3 py-1 text-xs font-medium capitalize text-black'>
            {status}
          </span>
        </div>
        <div className='flex items-center gap-2'>
          <TriggerVerifyIdentity
            projectId={projectId}
            identityId={identity.id}
          />
          <DeleteIdentity
            projectId={projectId}
            identityId={identity.id}
            identityDomain={identity.domain!}
          />
        </div>
      </div>
      <h3 className='mt-4 text-lg font-semibold text-zinc-200 hover:text-zinc-50'>
        <a href={`/projects/${projectId}/identities/${identity.id}`}>
          {identity.domain}
          <ArrowUpRight size={16} className='ml-1 inline-block stroke-[3px]' />
        </a>
      </h3>
      <p className='mt-1 text-sm text-zinc-400'>Last updated {lastUpdatedAt}</p>
    </div>
  );
}
