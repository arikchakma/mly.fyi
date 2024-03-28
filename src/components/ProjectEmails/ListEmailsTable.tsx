import type { ListProjectEmailsResponse } from '../../pages/api/v1/projects/[projectId]/emails';
import { DateTime } from 'luxon';

type ListProjectEmailsTableProps = {
  emails: ListProjectEmailsResponse['data'];
};

export function ListProjectEmailsTable(props: ListProjectEmailsTableProps) {
  const { emails = [] } = props;

  return (
    <table className="w-full table-fixed border-separate border-spacing-0 border-none text-left text-sm font-normal">
      <thead>
        <tr>
          <th className="max-w-20 rounded-tl border-b border-l border-t border-zinc-700/80 px-2 py-1.5 font-normal text-zinc-400">
            To
          </th>
          <th className="max-w-20 border-b border-t border-zinc-700/80 px-2 py-1.5 font-normal text-zinc-400">
            Subject
          </th>
          <th className="w-20 border-b border-t border-zinc-700/80 px-2 py-1.5 font-normal text-zinc-400">
            Status
          </th>
          <th className="w-32 rounded-tr border-b border-r border-t border-zinc-700/80 px-2 py-1.5 font-normal text-zinc-400">
            Send At
          </th>
        </tr>
      </thead>
      <tbody>
        {emails?.map((email) => {
          const status = email.status.replace('-', ' ');
          const sendAt =
            email.status === 'sent' &&
            email.sendAt &&
            DateTime.fromJSDate(new Date(email?.sendAt)).toRelative();

          return (
            <tr key={email.id}>
              <td className="truncate border-b border-l border-zinc-700/80 px-2 py-1.5">
                {email.to}
              </td>
              <td className="w-full truncate border-b border-zinc-700/80 px-2 py-1.5">
                {email.subject}
              </td>
              <td className="relative w-full truncate border-b border-zinc-700/80 px-2 py-1.5 capitalize">
                {status}
              </td>
              <td className="truncate border-b border-r border-zinc-700/80 px-2 py-1.5">
                {sendAt || 'N/A'}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
