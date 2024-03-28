import { Fragment } from 'react';
import { DateTime } from 'luxon';
import type { GetProjectEmailResponse } from '../../pages/api/v1/projects/[projectId]/emails/[emailId]/index';

type EmailEventTableProps = {
  events: GetProjectEmailResponse['events'];
};

export function EmailEventTable(props: EmailEventTableProps) {
  const { events = [] } = props;

  return (
    <>
      <h3 className='text-xs uppercase text-zinc-400'>Email Events</h3>
      <ul className='no-scrollbar mt-2 flex min-h-32 items-center overflow-x-auto rounded-md border border-zinc-800 bg-zinc-900/40 p-2'>
        {events.map((event) => {
          const timestamp = DateTime.fromJSDate(
            new Date(event.timestamp),
          ).toFormat('dd LLL yyyy, HH:mm');
          const status = event.type.replace('-', ' ');
          const isLast = events.indexOf(event) === events.length - 1;

          return (
            <Fragment key={event.id}>
              <li className='relative flex flex-col items-center gap-2 px-2'>
                <span className='rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-sm capitalize leading-none'>
                  {status}
                </span>
                <span className='block shrink-0 whitespace-nowrap text-xs text-zinc-500'>
                  {timestamp}
                </span>

                {!isLast && (
                  <hr className='absolute -right-1/2 top-3 -z-10 h-0.5 w-full border-dashed border-zinc-800' />
                )}
              </li>
            </Fragment>
          );
        })}
      </ul>
    </>
  );
}
