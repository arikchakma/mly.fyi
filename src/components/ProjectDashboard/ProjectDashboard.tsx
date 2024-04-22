import { cn } from '@/utils/classname';
import { formatCommaNumber, getPercentage } from '@/utils/number';
import { useQuery } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { httpGet } from '@/lib/http';
import type { GetProjectStatsResponse } from '@/pages/api/v1/projects/[projectId]/stats';
import { queryClient } from '@/utils/query-client';
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

  const { total, stats } = data;
  const deliveredEvents = stats.map((stat) => {
    return {
      date: stat.date,
      count: stat.delivered,
    };
  });
  const openedEvents = stats.map((stat) => {
    return {
      date: stat.date,
      count: stat.opened,
    };
  });
  const clickedEvents = stats.map((stat) => {
    return {
      date: stat.date,
      count: stat.clicked,
    };
  });
  const bouncedEvents = stats.map((stat) => {
    return {
      date: stat.date,
      count: stat.bounced,
    };
  });
  const complainedEvents = stats.map((stat) => {
    return {
      date: stat.date,
      count: stat.complained,
    };
  });

  return (
    <div className=''>
      <h3 className='text-xl font-semibold'>Email Statistics</h3>
      <p className='mt-1 text-sm text-zinc-500'>
        Overview of email statistics for the project.
      </p>

      <div className='grid grid-cols-3 gap-6 mt-10'>
        <ProjectStatisticColumn
          label='Delivered'
          total={total.delivered}
          percentage={getPercentage(total.delivered, total.sent)}
          events={deliveredEvents}
          barClassName='bg-green-950 after:bg-green-400'
        />
        <ProjectStatisticColumn
          label='Opened'
          total={total.opened}
          percentage={getPercentage(total.opened, total.sent)}
          events={openedEvents}
          barClassName='bg-blue-950 after:bg-blue-400'
        />
        <ProjectStatisticColumn
          label='Clicked'
          total={total.clicked}
          percentage={getPercentage(total.clicked, total.sent)}
          events={clickedEvents}
          barClassName='bg-purple-950 after:bg-purple-400'
        />
        <ProjectStatisticColumn
          label='Bounced'
          total={total.bounced}
          percentage={getPercentage(total.bounced, total.sent)}
          events={bouncedEvents}
          barClassName='bg-red-950 after:bg-red-400'
        />
        <ProjectStatisticColumn
          label='Complaints'
          total={total.complained}
          percentage={getPercentage(total.complained, total.sent)}
          events={complainedEvents}
          barClassName='bg-yellow-950 after:bg-yellow-400'
        />
      </div>
    </div>
  );
}

type ProjectStatisticColumnProps = {
  label: string;
  total: number;
  percentage: string;
  events: { date: string; count: number }[];
  barClassName?: string;
};

function ProjectStatisticColumn(props: ProjectStatisticColumnProps) {
  const { label, total, percentage, events, barClassName } = props;

  return (
    <div>
      <h4 className='text-sm'>{label}</h4>
      <p className='mt-1 text-lg font-semibold font-mono tabular-nums'>
        {formatCommaNumber(total)}
        <span className='text-sm ml-2 font-normal'>({percentage}%)</span>
      </p>

      <div
        className='h-[180px] grid gap-px items-end mt-6'
        style={{
          gridTemplateColumns: `repeat(${events.length}, 1fr)`,
          gridTemplateRows: `repeat(1, 1fr)`,
        }}
      >
        {events.map((event) => {
          const percentage = getPercentage(event.count, total);
          const date = DateTime.fromISO(event.date).toFormat('dd');

          return (
            <div
              key={event.date}
              className='h-full gap-3 flex flex-col justify-end items-center'
            >
              <div
                style={{
                  height: `${percentage}%`,
                }}
                className={cn(
                  'w-full relative after:absolute after:bottom-full after:left-0 after:w-full after:h-0.5 after:bg-zinc-400',
                  barClassName,
                )}
              />

              <span className='text-xs text-zinc-600 font-mono tabular-nums'>
                {date}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
