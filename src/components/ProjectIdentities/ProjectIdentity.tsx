import { useQuery } from '@tanstack/react-query';
import { queryClient } from '../../utils/query-client';
import { httpGet } from '../../lib/http';
import type { ProjectIdentity } from '@/db/types';
import { Box } from 'lucide-react';
import { CopyableTableField } from './CopyableTableField';
import { LoadingMessage } from '../LoadingMessage';

type ProjectIdentityProps = {
  projectId: string;
  identityId: string;
};

export function ProjectIdentity(props: ProjectIdentityProps) {
  const { projectId, identityId } = props;

  const { data: identity } = useQuery(
    {
      queryKey: ['project-identity', projectId, identityId],
      queryFn: () => {
        return httpGet<ProjectIdentity>(
          `/api/v1/projects/${projectId}/identities/${identityId}`,
        );
      },
    },
    queryClient,
  );

  if (!identity) {
    return <LoadingMessage message="Loading Project Identity.." />;
  }

  return (
    <section>
      <div className="flex items-center gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-md border border-zinc-700">
          <Box size={28} />
        </span>
        <div>
          <span className="text-sm text-zinc-500">Identity</span>
          <h2 className="text-xl font-semibold">{identity.domain}</h2>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-xl font-semibold">Records</h3>
        <p className="mt-1 text-sm text-zinc-500">
          These are the DNS records you need to add to your domain.
        </p>
        <table className="mt-4 w-full table-fixed border-separate border-spacing-0 border-none text-left text-sm font-normal">
          <thead>
            <tr>
              <th className="w-20 rounded-tl border-b border-l border-t border-zinc-700/80 px-2 py-1.5 font-normal text-zinc-400">
                Type
              </th>
              <th className="max-w-20 border-b border-t border-zinc-700/80 px-2 py-1.5 font-normal text-zinc-400">
                Name
              </th>
              <th className="max-w-20 border-b border-t border-zinc-700/80 px-2 py-1.5 font-normal text-zinc-400">
                Value
              </th>
              <th className="w-20 border-b border-t border-zinc-700/80 px-2 py-1.5 font-normal text-zinc-400">
                Priority
              </th>
              <th className="w-20 border-b border-t border-zinc-700/80 px-2 py-1.5 font-normal text-zinc-400">
                TTL
              </th>
              <th className="w-32 rounded-tr border-b border-r border-t border-zinc-700/80 px-2 py-1.5 font-normal text-zinc-400">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {identity?.records?.map((record, counter) => {
              const status = record.status.replace('-', ' ');

              return (
                <tr key={`${record.value}${counter}`}>
                  <td className="border-b border-l border-zinc-700/80 px-2 py-1.5">
                    {record.type}
                  </td>
                  <td className="w-full truncate border-b border-zinc-700/80 px-2 py-1.5">
                    <CopyableTableField value={record.name} />
                  </td>
                  <td className="relative w-full truncate border-b border-zinc-700/80 px-2 py-1.5">
                    <CopyableTableField value={record.value} />
                  </td>
                  <td className="border-b border-zinc-700/80 px-2 py-1.5">
                    {record.priority}
                  </td>
                  <td className="border-b border-zinc-700/80 px-2 py-1.5">
                    {record.ttl}
                  </td>
                  <td className="border-b border-r border-zinc-700/80 px-2 py-1.5 capitalize">
                    {status}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
