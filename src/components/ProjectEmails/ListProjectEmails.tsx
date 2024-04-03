import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { httpGet } from '../../lib/http';
import type { ListProjectEmailsResponse } from '../../pages/api/v1/projects/[projectId]/emails/index';
import { queryClient } from '../../utils/query-client';
import { PageError } from '../Errors/PageError';
import { LoadingMessage } from '../LoadingMessage';
import { Pagination } from '../Pagination';
import { ListProjectEmailsTable } from './ListEmailsTable';

type ListProjectEmailsProps = {
  projectId: string;
};

export function ListProjectEmails(props: ListProjectEmailsProps) {
  const { projectId } = props;

  const [currPage, setCurrPage] = useState(1);
  const { data, error } = useQuery(
    {
      queryKey: ['project-emails', projectId, { currPage }],
      queryFn: () => {
        return httpGet<ListProjectEmailsResponse>(
          `/api/v1/projects/${projectId}/emails`,
          {
            currPage,
          },
        );
      },
    },
    queryClient,
  );

  useEffect(() => {
    if (!data) {
      return;
    }

    setCurrPage(data.currPage || 1);
  }, [data]);

  if (error && !data) {
    return (
      <PageError
        error={error?.message || 'Something went wrong!'}
        className='sm:pt-0'
      />
    );
  }

  if (!data) {
    return <LoadingMessage message='Loading Project Emails...' />;
  }

  const emails = data.data;

  return (
    <>
      <div className='flex items-center justify-between'>
        <h2 className='text-xl font-semibold'>Emails</h2>
      </div>

      <div className='mt-6'>
        {emails.length === 0 && (
          <p className='text-zinc-500'>No emails found.</p>
        )}

        {emails.length > 0 && (
          <div className='space-y-4'>
            <ListProjectEmailsTable emails={emails} />
            <Pagination
              totalPages={data.totalPages}
              currPage={data.currPage}
              perPage={data.perPage}
              totalCount={data.totalCount}
              onPageChange={(page) => {
                setCurrPage(page);
              }}
            />
          </div>
        )}
      </div>
    </>
  );
}
