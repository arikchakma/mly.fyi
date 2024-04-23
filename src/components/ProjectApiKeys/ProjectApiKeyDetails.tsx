import { useQuery } from '@tanstack/react-query';
import { Key } from 'lucide-react';
import { DateTime } from 'luxon';
import { httpGet } from '../../lib/http';
import type { GetProjectApiKeyResponse } from '../../pages/api/v1/projects/[projectId]/keys/[keyId]/index';
import { queryClient } from '../../utils/query-client';
import { PageError } from '../Errors/PageError';
import { LoadingMessage } from '../LoadingMessage';

type ProjectApiKeyDetailsProps = {
  projectId: string;
  keyId: string;
};

export function ProjectApiKeyDetails(props: ProjectApiKeyDetailsProps) {
  const { projectId, keyId } = props;

  const { data: apiKeyDetails, error } = useQuery(
    {
      queryKey: ['project-api-keys', projectId, keyId],
      queryFn: () => {
        return httpGet<GetProjectApiKeyResponse>(
          `/api/v1/projects/${projectId}/keys/${keyId}`,
        );
      },
    },
    queryClient,
  );

  if (error && !apiKeyDetails) {
    return (
      <PageError
        error={error?.message || 'Something went wrong!'}
        className='sm:pt-0'
      />
    );
  }

  if (!apiKeyDetails) {
    return <LoadingMessage message='Loading Project Api Key...' />;
  }

  const createdAt = DateTime.fromJSDate(
    new Date(apiKeyDetails.createdAt),
  ).toRelative();
  const lastUsedAt =
    apiKeyDetails?.lastUsedAt &&
    DateTime.fromJSDate(new Date(apiKeyDetails.lastUsedAt)).toRelative();

  return (
    <>
      <div className='flex items-center gap-4'>
        <span className='flex h-[52px] w-[52px] items-center justify-center rounded-md border  border-zinc-800 bg-zinc-900'>
          <Key size={28} />
        </span>
        <div>
          <span className='text-sm text-zinc-500'>Api Key</span>
          <h2 className='text-xl font-semibold'>{apiKeyDetails.name}</h2>
        </div>
      </div>

      <div className='mt-10 flex items-start gap-6'>
        <div>
          <h3 className='text-xs uppercase text-zinc-400'>Created At</h3>
          <span className='mt-1 font-semibold capitalize'>{createdAt}</span>
        </div>
        <div>
          <h3 className='text-xs uppercase text-zinc-400'>Status</h3>
          <span className='mt-1 font-semibold capitalize'>
            {apiKeyDetails.status}
          </span>
        </div>
        <div>
          <h3 className='text-xs uppercase text-zinc-400'>Last Used</h3>
          <span className='mt-1 font-semibold capitalize'>
            {lastUsedAt || 'Never'}
          </span>
        </div>
        <div>
          <h3 className='text-xs uppercase text-zinc-400'>Usage Count</h3>
          <span className='mt-1 font-semibold capitalize'>
            {apiKeyDetails?.usageCount || 0}
          </span>
        </div>
      </div>
    </>
  );
}
