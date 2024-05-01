import { cn } from '@/utils/classname';
import { formatCommaNumber, getPercentage } from '@/utils/number';
import type { LucideIcon } from 'lucide-react';
import { BarChart } from 'lucide-react';
import { DateTime } from 'luxon';
import { useState } from 'react';

type EventType = {
  date: string;
  count: number;
};

type ProjectStatisticColumnProps = {
  label: string;
  total: number;
  icon?: LucideIcon;
  percentage: string;
  events: EventType[];
  barClassName?: string;
  className?: string;
};

export function ProjectStatisticColumn(props: ProjectStatisticColumnProps) {
  const {
    label,
    total,
    icon: Icon = BarChart,
    percentage,
    events,
    barClassName,
    className,
  } = props;

  const [selectedEvent, setSelectedEvent] = useState<EventType | null>(null);
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
            <button
              key={event.date}
              className='w-full flex flex-col items-center'
              onMouseEnter={() => setSelectedEvent(event)}
              onMouseLeave={() => setSelectedEvent(null)}
            >
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

              {shouldShowBottomDate && !selectedEvent && (
                <span className='text-xs mt-3 text-zinc-600 font-mono tabular-nums'>
                  {date}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {!shouldShowBottomDate && !selectedEvent && (
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

      {selectedEvent && (
        <div className='mt-3 flex items-center justify-center'>
          <p className='text-xs text-zinc-600 font-mono tabular-nums whitespace-nowrap'>
            {DateTime.fromISO(selectedEvent.date).toFormat('dd MMM yyyy')}
            ,&nbsp;
            {formatCommaNumber(selectedEvent.count)} (
            {getPercentage(selectedEvent.count, total)}%)
          </p>
        </div>
      )}
    </div>
  );
}
