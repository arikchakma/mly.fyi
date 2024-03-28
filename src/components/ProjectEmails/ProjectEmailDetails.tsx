import { useQuery } from '@tanstack/react-query';
import { Box } from 'lucide-react';
import { DateTime } from 'luxon';
import { httpGet } from '../../lib/http';
import type { GetProjectEmailResponse } from '../../pages/api/v1/projects/[projectId]/emails/[emailId]/index';
import { queryClient } from '../../utils/query-client';
import { PageError } from '../Errors/PageError';
import { LoadingMessage } from '../LoadingMessage';
import { EmailEventTable } from './EmailEventTable';

type ProjectEmailDetailsProps = {
  projectId: string;
  emailId: string;
};

export function ProjectEmailDetails(props: ProjectEmailDetailsProps) {
  const { projectId, emailId } = props;

  const { data, error } = useQuery(
    {
      queryKey: ['project-emails', projectId, emailId],
      queryFn: () => {
        return httpGet<GetProjectEmailResponse>(
          `/api/v1/projects/${projectId}/emails/${emailId}`,
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

  const status = data.status.replace('-', ' ');
  const createdAt = DateTime.fromJSDate(new Date(data.createdAt)).toRelative();

  return (
    <section>
      <div className='flex items-center gap-4'>
        <span className='flex h-12 w-12 items-center justify-center rounded-md border  border-zinc-800 bg-zinc-900'>
          <Box size={28} />
        </span>
        <div>
          <span className='text-sm text-zinc-500'>Email</span>
          <h2 className='text-xl font-semibold'>{data.to}</h2>
        </div>
      </div>

      <div className='mb-6 mt-10 grid grid-cols-2 gap-3'>
        <div>
          <h3 className='text-xs uppercase text-zinc-400'>From</h3>
          <p className='mt-1 truncate'>{data.from}</p>
        </div>
        <div>
          <h3 className='text-xs uppercase text-zinc-400'>To</h3>
          <p className='mt-1 truncate'>{data.to}</p>
        </div>
        <div>
          <h3 className='text-xs uppercase text-zinc-400'>Subject</h3>
          <p className='mt-1 truncate'>{data.subject}</p>
        </div>
      </div>

      <EmailEventTable events={data.events} />
    </section>
  );
}
