import { formatCommaNumber } from '@/utils/number';
import { useQuery } from '@tanstack/react-query';
import { httpGet } from '../../lib/http';
import type { GetProjectStatsResponse } from '../../pages/api/v1/projects/[projectId]/stats';
import { queryClient } from '../../utils/query-client';
import { PageError } from '../Errors/PageError';
import { LoadingMessage } from '../LoadingMessage';

type ProjectDashboardProps = {
  projectId: string;
};

export function ProjectDashboard(props: ProjectDashboardProps) {
  const { projectId } = props;

  const { data, error } = useQuery(
    {
      queryKey: ['project-stats', projectId],
      queryFn: () => {
        return httpGet<GetProjectStatsResponse>(
          `/api/v1/projects/${projectId}/stats`,
          {},
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

  return (
    <div className=''>
      <h3 className='text-xl font-semibold'>Email Statistics</h3>
      <p className='mt-1 text-sm text-zinc-500'>
        Overview of email statistics for the project.
      </p>

      <div className='grid grid-cols-1 gap-1.5 mt-6 sm:grid-cols-2'>
        <ProjectStatisticColumn
          label='Total Sent'
          value={data.totalEmailsSent}
        />
        <ProjectStatisticColumn label='Opened' value={data.totalEmailsOpened} />
        <ProjectStatisticColumn
          label='Clicked'
          value={data.totalEmailsClicked}
        />
        <ProjectStatisticColumn
          label='Bounced'
          value={data.totalEmailsBounced}
        />
        <ProjectStatisticColumn
          label='Complaints'
          value={data.totalEmailsMarkedAsSpam}
        />
      </div>
    </div>
  );
}

type ProjectStatisticColumnProps = {
  label: string;
  value: number;
};

function ProjectStatisticColumn(props: ProjectStatisticColumnProps) {
  const { label, value } = props;

  return (
    <div className='bg-zinc-900 border border-zinc-800 rounded-md p-2.5'>
      <h3 className='text-sm tracking-tight text-zinc-400 font-medium'>
        {label}
      </h3>
      <p className='mt-1 font-semibold font-mono tabular-nums'>
        {formatCommaNumber(value)}
      </p>
    </div>
  );
}
