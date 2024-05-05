import { httpGet } from '@/lib/http';
import type { ListProjectIdentitiesResponse } from '@/pages/api/v1/projects/[projectId]/identities';
import { queryClient } from '@/utils/query-client';
import { useQuery } from '@tanstack/react-query';
import { Fingerprint } from 'lucide-react';
import { useState } from 'react';
import { EmptyItems } from '../EmptyItems';
import { PageError } from '../Errors/PageError';
import { LoadingMessage } from '../LoadingMessage';
import { Pagination } from '../Pagination';
import { ProjectIdentityItem } from './ProjectIdentityItem';

type ListProjectIdentitiesProps = {
  projectId: string;
};

export function ListProjectIdentities(props: ListProjectIdentitiesProps) {
  const { projectId } = props;

  const [currPage, setCurrPage] = useState(1);
  const { data, error } = useQuery(
    {
      queryKey: ['project-identities', projectId, currPage],
      queryFn: () => {
        return httpGet<ListProjectIdentitiesResponse>(
          `/api/v1/projects/${projectId}/identities`,
          {
            currPage,
          },
        );
      },
    },
    queryClient,
  );

  if (error && !data) {
    return (
      <PageError
        error={error?.message || 'Something went wrong!'}
        className='sm:pt-0'
      />
    );
  }

  if (!data) {
    return <LoadingMessage message='Loading Project Identities...' />;
  }

  const identities = data.data;

  return (
    <>
      {identities.length === 0 && (
        <EmptyItems
          title='No identities found.'
          description='Add an identity to start sending emails from that identity. You can add multiple identities to a project.'
          linkText='Add Identity'
          link={`/projects/${projectId}/identities/new`}
          icon={Fingerprint}
        />
      )}

      {identities.length > 0 && (
        <>
          <div className='flex items-start justify-between gap-4'>
            <div>
              <h2 className='text-xl font-semibold'>Indentites</h2>
              <p className='text-sm text-zinc-500 text-balance mt-1'>
                You can send emails from the identities you've verified.
              </p>
            </div>
            <a
              className='rounded-md bg-zinc-800 px-2 py-1 text-sm text-zinc-50 shrink-0'
              href={`/projects/${projectId}/identities/new`}
            >
              <span className='mr-2'>+</span> <span>Add Indentity</span>
            </a>
          </div>

          <hr className='my-8 border-zinc-800' />

          <ul className='mb-4 grid grid-cols-3 gap-2'>
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
          <Pagination
            totalPages={data.totalPages}
            currPage={data.currPage}
            perPage={data.perPage}
            totalCount={data.totalCount}
            onPageChange={(page) => {
              setCurrPage(page);
            }}
          />
        </>
      )}
    </>
  );
}
