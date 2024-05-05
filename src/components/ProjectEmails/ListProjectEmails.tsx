import { httpGet } from '@/lib/http';
import type { ListProjectEmailsResponse } from '@/pages/api/v1/projects/[projectId]/emails/index';
import { queryClient } from '@/utils/query-client';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import { EmptyItems } from '../EmptyItems';
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
      {emails.length === 0 && (
        <EmptyItems
          title='No emails found.'
          description='You can view the status of each email and track the delivery status. Start by sending an email.'
          linkText='Start Sending Email'
          link='https://mly.fyi/docs/send-email'
          icon={Mail}
        />
      )}

      {emails.length > 0 && (
        <>
          <div className='flex items-center justify-between'>
            <h2 className='text-xl font-semibold'>Emails</h2>

            <a
              href='https://mly.fyi/docs/send-email'
              className='rounded-md bg-zinc-800 px-2 py-1 text-sm text-zinc-50 shrink-0 mt-4'
              target='_blank'
              rel='noreferrer'
            >
              <ArrowUpRight className='w-4 h-4 inline-block mr-1' />
              Learn more
            </a>
          </div>
          <div className='mt-6'>
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
          </div>
        </>
      )}
    </>
  );
}
