import { httpGet } from '@/lib/http';
import { queryClient } from '@/utils/query-client';
import { useQuery } from '@tanstack/react-query';
import { LoadingMessage } from '../LoadingMessage';
import type { ListProjectApiKeysResponse } from '@/pages/api/v1/projects/[projectId]/keys/index';
import { ProjectApiKeyItem } from './ProjectApiKeyItem';

type ListProjectApiKeysProps = {
  projectId: string;
};

export function ListProjectApiKeys(props: ListProjectApiKeysProps) {
  const { projectId } = props;

  const { data } = useQuery(
    {
      queryKey: ['project-api-keys', projectId],
      queryFn: () => {
        return httpGet<ListProjectApiKeysResponse>(
          `/api/v1/projects/${projectId}/keys`,
        );
      },
    },
    queryClient,
  );

  if (!data) {
    return <LoadingMessage message='Loading Project Identities...' />;
  }

  const apiKeys = data.data;

  return (
    <>
      <div className='flex items-center justify-between'>
        <h2 className='text-xl font-semibold'>Keys</h2>
        <a
          className='rounded-md bg-zinc-800 px-2 py-1 text-sm text-zinc-50'
          href={`/projects/${projectId}/keys/new`}
        >
          <span className='mr-2'>+</span> <span>Create new Key</span>
        </a>
      </div>

      <div className='mt-6'>
        {apiKeys.length === 0 && (
          <p className='text-zinc-500'>No Keys found.</p>
        )}

        {apiKeys.length > 0 && (
          <ul className='grid grid-cols-3 gap-2'>
            {apiKeys.map((apiKey) => {
              return (
                <li key={apiKey.id}>
                  <ProjectApiKeyItem projectId={projectId} apiKey={apiKey} />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
