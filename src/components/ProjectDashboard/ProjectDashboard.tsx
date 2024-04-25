import { httpGet } from '@/lib/http';
import type { GetProjectStatsResponse } from '@/pages/api/v1/projects/[projectId]/stats';
import { setUrlParams } from '@/utils/browser';
import { cn } from '@/utils/classname';
import { formatCommaNumber, getPercentage } from '@/utils/number';
import { queryClient } from '@/utils/query-client';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Flag,
  type LucideIcon,
  MailCheck,
  MailOpen,
  MailWarning,
  MailX,
  MousePointerClick,
} from 'lucide-react';
import { DateTime } from 'luxon';
import { useState } from 'react';
import { PageError } from '../Errors/PageError';
import { LoadingMessage } from '../LoadingMessage';

const ALLOWED_STAT_DAYS = [10, 15, 30];

type ProjectDashboardProps = {
  projectId: string;
  days?: number;
};

export function ProjectDashboard(props: ProjectDashboardProps) {
  const { projectId, days: defaultDays } = props;

  const [days, setDays] = useState(defaultDays || ALLOWED_STAT_DAYS[0]);

  const { data, error } = useQuery(
    {
      queryKey: ['project-stats', projectId, days],
      queryFn: () => {
        return httpGet<GetProjectStatsResponse>(
          `/api/v1/projects/${projectId}/stats`,
          {
            days,
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

  const { total, stats, days: currentStatDays } = data;
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
  const softBouncedEvents = stats.map((stat) => {
    return {
      date: stat.date,
      count: stat.softBounced,
    };
  });

  return (
    <div className=''>
      <h3 className='text-xl font-semibold'>Email Statistics</h3>
      <p className='mt-1 text-sm text-zinc-500'>
        Overview of email statistics for the project.
      </p>

      <div className='flex items-center justify-end gap-2 mt-10'>
        <div className='flex'>
          {ALLOWED_STAT_DAYS.map((days, index) => {
            const isFirst = index === 0;
            const isLast = index === ALLOWED_STAT_DAYS.length - 1;
            const isActive = days === currentStatDays;

            return (
              <button
                key={days}
                className={cn(
                  'text-sm bg-zinc-900 p-0.5 px-1.5 border-y border-zinc-800 font-mono tabular-nums outline-none focus-visible:ring-1 focus-visible:ring-zinc-700 focus-visible:z-10',
                  isFirst ? 'rounded-l-md border' : '',
                  isLast ? 'rounded-r-md border-r border-l' : '',
                  isActive ? 'bg-zinc-800' : '',
                )}
                onClick={() => {
                  setDays(days);
                  setUrlParams({ d: String(days) });
                }}
              >
                {days}d
              </button>
            );
          })}
        </div>
      </div>
      <div className='grid grid-cols-3 mt-4'>
        <ProjectStatisticColumn
          label='Delivered'
          total={total.delivered}
          icon={MailCheck}
          percentage={getPercentage(total.delivered, total.sent)}
          events={deliveredEvents}
          barClassName='bg-green-950 after:bg-green-400'
          className='border border-l-0 border-zinc-900'
        />
        <ProjectStatisticColumn
          label='Opened'
          total={total.opened}
          icon={MailOpen}
          percentage={getPercentage(total.opened, total.sent)}
          events={openedEvents}
          barClassName='bg-blue-950 after:bg-blue-400'
          className='border border-l-0 border-zinc-900'
        />
        <ProjectStatisticColumn
          label='Clicked'
          total={total.clicked}
          icon={MousePointerClick}
          percentage={getPercentage(total.clicked, total.sent)}
          events={clickedEvents}
          barClassName='bg-purple-950 after:bg-purple-400'
          className='border border-l-0 border-r-0 border-zinc-900'
        />
        <ProjectStatisticColumn
          label='Bounced'
          total={total.bounced}
          icon={MailX}
          percentage={getPercentage(total.bounced, total.sent)}
          events={bouncedEvents}
          barClassName='bg-red-950 after:bg-red-400'
          className='border border-t-0 border-l-0 border-zinc-900'
        />
        <ProjectStatisticColumn
          label='Soft Bounced'
          total={total.softBounced}
          icon={MailWarning}
          percentage={getPercentage(total.softBounced, total.sent)}
          events={softBouncedEvents}
          barClassName='bg-red-950 after:bg-red-400'
          className='border border-l-0 border-t-0 border-zinc-900'
        />
        <ProjectStatisticColumn
          label='Complaints'
          total={total.complained}
          icon={Flag}
          percentage={getPercentage(total.complained, total.sent)}
          events={complainedEvents}
          barClassName='bg-yellow-950 after:bg-yellow-400'
          className='border-b border-zinc-900'
        />
      </div>
    </div>
  );
}

type ProjectStatisticColumnProps = {
  label: string;
  total: number;
  icon?: LucideIcon;
  percentage: string;
  events: { date: string; count: number }[];
  barClassName?: string;
  className?: string;
};

function ProjectStatisticColumn(props: ProjectStatisticColumnProps) {
  const {
    label,
    total,
    icon: Icon = BarChart,
    percentage,
    events,
    barClassName,
    className,
  } = props;

  const shouldShowBottomDate = events.length <= 10;

  return (
    <div className={cn('p-2.5', className)}>
      <h4 className='text-sm flex items-center gap-1.5'>
        <Icon size={14} className='stroke-[2.5px]' />
        {label}
      </h4>
      <p className='mt-1 text-lg font-semibold font-mono tabular-nums'>
        {formatCommaNumber(total)}
        <span className='text-sm ml-2 font-normal'>({percentage}%)</span>
      </p>

      <div
        className='grid gap-px items-end mt-6'
        style={{
          gridTemplateColumns: `repeat(${events.length}, 1fr)`,
          gridTemplateRows: `repeat(1, 1fr)`,
        }}
      >
        {events.map((event) => {
          const percentage = getPercentage(event.count, total);
          const date = DateTime.fromISO(event.date).toFormat('dd');

          return (
            <div key={event.date} className='w-full flex flex-col items-center'>
              <div className='h-[180px] w-full flex flex-col justify-end'>
                <div
                  style={{
                    height: `${percentage}%`,
                  }}
                  className={cn(
                    'w-full relative after:absolute after:bottom-full after:left-0 after:w-full after:h-0.5 after:bg-zinc-400',
                    barClassName,
                  )}
                />
              </div>

              {shouldShowBottomDate && (
                <span className='text-xs mt-3 text-zinc-600 font-mono tabular-nums'>
                  {date}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {!shouldShowBottomDate && (
        <div className='flex items-center justify-between gap-2 mt-3'>
          <span className='text-xs text-zinc-600 font-mono tabular-nums'>
            {DateTime.fromISO(events[0].date).toFormat('dd MMM')}
          </span>
          <span className='text-xs text-zinc-600 font-mono tabular-nums'>
            {DateTime.fromISO(events[events.length - 1].date).toFormat(
              'dd MMM',
            )}
          </span>
        </div>
      )}
    </div>
  );
}
