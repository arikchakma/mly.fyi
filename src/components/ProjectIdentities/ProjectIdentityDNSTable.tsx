import React from 'react';
import { CopyableTableField } from './CopyableTableField';
import type { ProjectIdentityRecord } from '../../db/types';

type ProjectIdentityDNSTableProps = {
  records: ProjectIdentityRecord[];
};

export function ProjectIdentityDNSTable(props: ProjectIdentityDNSTableProps) {
  const { records = [] } = props;

  return (
    <table className='w-full table-fixed border-separate border-spacing-0 border-none text-left text-sm font-normal'>
      <thead>
        <tr>
          <th className='w-20 rounded-tl border-b border-l border-t border-zinc-700/80 px-2 py-1.5 font-normal text-zinc-400'>
            Type
          </th>
          <th className='max-w-20 border-b border-t border-zinc-700/80 px-2 py-1.5 font-normal text-zinc-400'>
            Name
          </th>
          <th className='max-w-20 border-b border-t border-zinc-700/80 px-2 py-1.5 font-normal text-zinc-400'>
            Value
          </th>
          <th className='w-20 border-b border-t border-zinc-700/80 px-2 py-1.5 font-normal text-zinc-400'>
            Priority
          </th>
          <th className='w-20 border-b border-t border-zinc-700/80 px-2 py-1.5 font-normal text-zinc-400'>
            TTL
          </th>
          <th className='w-32 rounded-tr border-b border-r border-t border-zinc-700/80 px-2 py-1.5 font-normal text-zinc-400'>
            Status
          </th>
        </tr>
      </thead>
      <tbody>
        {records?.map((record, counter) => {
          const status = record.status.replace('-', ' ');

          return (
            <tr key={`${record.value}${counter}`}>
              <td className='border-b border-l border-zinc-700/80 px-2 py-1.5'>
                {record.type}
              </td>
              <td className='w-full truncate border-b border-zinc-700/80 px-2 py-1.5'>
                <CopyableTableField value={record.name} />
              </td>
              <td className='relative w-full truncate border-b border-zinc-700/80 px-2 py-1.5'>
                <CopyableTableField value={record.value} />
              </td>
              <td className='border-b border-zinc-700/80 px-2 py-1.5'>
                {record.priority}
              </td>
              <td className='border-b border-zinc-700/80 px-2 py-1.5'>
                {record.ttl}
              </td>
              <td className='border-b border-r border-zinc-700/80 px-2 py-1.5 capitalize'>
                {status}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
