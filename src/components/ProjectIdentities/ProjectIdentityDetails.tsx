import { useQuery } from '@tanstack/react-query';
import { queryClient } from '../../utils/query-client';
import { httpGet } from '../../lib/http';
import type { ProjectIdentity } from '@/db/types';
import { Box } from 'lucide-react';
import { CopyableTableField } from './CopyableTableField';
import { LoadingMessage } from '../LoadingMessage';
import { useId } from 'react';
import { Checkbox } from '../Interface/Checkbox';

type ProjectIdentityDetailsProps = {
  projectId: string;
  identityId: string;
};

export function ProjectIdentityDetails(props: ProjectIdentityDetailsProps) {
  const { projectId, identityId } = props;

  const clickTrackingCheckboxId = `mly${useId()}`;
  const openTrackingCheckboxId = `mly${useId()}`;

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

      <div className="mt-6">
        <h3 className="text-xl font-semibold">Instructions</h3>
        <p className="mt-1 text-sm text-zinc-500">
          Follow these instructions to verify your domain.
        </p>
        <ol className="mt-4 list-inside list-decimal text-sm text-zinc-400">
          <li>Add the DNS records above to your domain provider.</li>
          <li>Click the refresh button to trigger a verification check.</li>
          <li>Wait for the records to propagate.</li>
        </ol>
      </div>

      <div className="mt-6">
        <h3 className="text-xl font-semibold">Configuration</h3>
        <p className="mt-1 text-sm text-zinc-500">
          Configure your domain to use the following settings.
        </p>

        <div className="mt-4 flex items-start gap-3">
          <Checkbox id={clickTrackingCheckboxId} />
          <div>
            <label
              htmlFor={clickTrackingCheckboxId}
              className="block max-w-max text-lg font-semibold leading-none text-zinc-200 hover:text-zinc-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Click Tracking
            </label>
            <p className="mt-1 text-balance text-sm text-zinc-400">
              For every link in your email, we will modify the links in the
              email, and whenver the user clicks on the link, we will track the
              click.
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-3">
          <Checkbox id={openTrackingCheckboxId} />
          <div>
            <label
              htmlFor={openTrackingCheckboxId}
              className="block max-w-max text-lg font-semibold leading-none text-zinc-200 hover:text-zinc-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Open Tracking
            </label>
            <p className="mt-1 text-balance text-sm text-zinc-400">
              We will track the open rate of your email. We will add a tracking
              pixel to your email, and when the user opens the email, we will
              track the open.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
