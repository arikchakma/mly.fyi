import type { GetProjectEmailResponse } from '@/pages/api/v1/projects/[projectId]/emails/[emailId]/index';
import { detect } from 'detect-browser';
import { DateTime } from 'luxon';
import { Fragment } from 'react';
import { EmailPreviewTabs } from './EmailPreviewTabs';

type EmailEventTableProps = {
  events: GetProjectEmailResponse['events'];
};

export function EmailEventTable(props: EmailEventTableProps) {
  let { events = [] } = props;
  events = events.sort((a, b) => {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return (
    <div>
      <h3 className='text-xs uppercase text-zinc-400'>Email Events</h3>
      <ul className='flex flex-col gap-2 mt-4'>
        {events.map((event) => {
          const timestamp = DateTime.fromJSDate(
            new Date(event.timestamp),
          ).toFormat('dd LLL yyyy, HH:mm');
          const status = event.type.replace('-', ' ');
          const isLast = events.indexOf(event) === events.length - 1;
          const browser = event?.userAgent && detect(event.userAgent);

          return (
            <Fragment key={event.id}>
              <li className='relative pr-2'>
                <div className='flex items-center gap-2'>
                  <span className='rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-sm capitalize leading-none'>
                    {status}
                  </span>
                  <span className='block shrink-0 whitespace-nowrap text-xs text-zinc-500'>
                    {timestamp}
                  </span>
                </div>

                {browser && (
                  <p className='text-xs text-zinc-500 mt-2'>
                    From&nbsp;
                    <span className='font-semibold capitalize'>
                      {browser.name} ({browser.version})
                    </span>
                    &nbsp;on&nbsp;
                    <span className='font-semibold'>{browser.os}</span>
                    {browser.type === 'bot' && (
                      <span className='text-red-500'> (bot)</span>
                    )}
                    {event?.type === 'clicked' && (
                      <>
                        , clicked&nbsp;
                        <span className='font-semibold'>
                          {event?.link || 'unknown'}
                        </span>
                      </>
                    )}
                  </p>
                )}
              </li>
              {!isLast && <hr className='border-dashed border-zinc-800' />}
            </Fragment>
          );
        })}
      </ul>
    </div>
  );
}
