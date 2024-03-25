import { httpGet } from '@/lib/http';
import { queryClient } from '@/utils/query-client';
import { useQuery } from '@tanstack/react-query';
import { LoadingMessage } from '../LoadingMessage';
import { ProjectIdentityItem } from './ProjectIdentityItem';
import type { ListProjectIdentitiesResponse } from '@/pages/api/v1/projects/[projectId]/identities';

type ListProjectIdentitiesProps = {
  projectId: string;
};

export function ListProjectIdentities(props: ListProjectIdentitiesProps) {
  const { projectId } = props;

  const { data } = useQuery(
    {
      queryKey: ['project-identities', projectId],
      queryFn: () => {
        return httpGet<ListProjectIdentitiesResponse>(
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
          <ul className="grid grid-cols-3 gap-2">
            {identities.map((identity) => {
              return (
                <li key={identity.id}>
                  <ProjectIdentityItem
                    identity={identity}
                    projectId={projectId}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
