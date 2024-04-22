import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '@/utils/query-client';
import { httpGet, httpPatch } from '@/lib/http';
import type { ProjectIdentity } from '@/db/types';
import { Box } from 'lucide-react';
import { CopyableTableField } from './CopyableTableField';
import { LoadingMessage } from '../LoadingMessage';
import { useId } from 'react';
import { Checkbox } from '../Interface/Checkbox';
import { DateTime } from 'luxon';
import { toast } from 'sonner';
import { TriggerVerifyIdentity } from './TriggerVerifyIdentity';
import { ProjectIdentityDNSTable } from './ProjectIdentityDNSTable';

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

  const updateConfigurationSet = useMutation(
    {
      mutationKey: ['update-configuration-set', projectId, identityId],
      mutationFn: (body: {
        openTracking?: boolean;
        clickTracking?: boolean;
      }) => {
        return httpPatch<{ status: 'ok' }>(
          `/api/v1/projects/${projectId}/identities/${identityId}/update`,
          body,
        );
      },
      onMutate: async (body) => {
        await queryClient.cancelQueries({
          queryKey: ['project-identity', projectId, identityId],
        });
        const previousIdentity = queryClient.getQueryData<ProjectIdentity>([
          'project-identity',
          projectId,
          identityId,
        ]);

        if (!previousIdentity) {
          return;
        }

        queryClient.setQueryData(
          ['project-identity', projectId, identityId],
          (old) => {
            return {
              ...(old || {}),
              ...body,
            };
          },
        );

        return { previousIdentity };
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['project-identity', projectId, identityId],
        });
      },
      onError(_, __, context) {
        if (context?.previousIdentity) {
          queryClient.setQueryData(
            ['project-identity', projectId, identityId],
            context.previousIdentity,
          );
        }
      },
    },
    queryClient,
  );

  if (!identity) {
    return <LoadingMessage message='Loading Project Identity..' />;
  }

  const createdAt = DateTime.fromJSDate(
    new Date(identity.createdAt),
  ).toRelative();
  const isIdentityVerified = identity.status === 'success';

  const dnsRecords = identity.records?.filter((r) => {
    return r.record !== 'REDIRECT_DOMAIN';
  });
  const redirectDomainDNSRecord = identity.records?.find((r) => {
    return r.record === 'REDIRECT_DOMAIN';
  });

  return (
    <section>
      <div className='flex items-center gap-4'>
        <span className='flex h-12 w-12 items-center justify-center rounded-md border  border-zinc-800 bg-zinc-900'>
          <Box size={28} />
        </span>
        <div>
          <span className='text-sm text-zinc-500'>Identity</span>
          <h2 className='text-xl font-semibold'>{identity.domain}</h2>
        </div>
      </div>

      <div className='mt-10 flex items-start gap-3'>
        <div>
          <h3 className='text-xs uppercase text-zinc-400'>Created At</h3>
          <span className='mt-1 font-semibold capitalize'>{createdAt}</span>
        </div>
        <div>
          <h3 className='text-xs uppercase text-zinc-400'>Status</h3>
          <span className='mt-1 font-semibold capitalize'>
            {identity.status}
          </span>
        </div>
      </div>

      <div className='mt-10'>
        <div className='flex items-center justify-between gap-2'>
          <h3 className='text-xl font-semibold'>Records</h3>
          <TriggerVerifyIdentity
            projectId={projectId}
            identityId={identityId}
            label='Trigger Verify'
            iconSize={14}
            className='gap-1 rounded-md bg-zinc-900 p-1 px-2 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50'
          />
        </div>
        <p className='mb-4 mt-1 text-sm text-zinc-500'>
          These are the DNS records you need to add to your domain.
        </p>
        <ProjectIdentityDNSTable records={dnsRecords || []} />

        {redirectDomainDNSRecord && (
          <>
            <p className='mb-4 mt-4 text-sm text-zinc-500'>
              The following record is required for click tracking and open
              tracking.
            </p>

            <ProjectIdentityDNSTable records={[redirectDomainDNSRecord]} />
          </>
        )}
      </div>

      <div className='mt-6'>
        <h3 className='text-xl font-semibold'>Instructions</h3>
        <p className='mt-1 text-sm text-zinc-500'>
          Follow these instructions to verify your domain.
        </p>
        <ol className='mt-4 list-inside list-decimal text-sm text-zinc-400'>
          <li>Add the DNS records above to your domain provider.</li>
          <li>Click the refresh button to trigger a verification check.</li>
          <li>Wait for the records to propagate.</li>
        </ol>
      </div>

      <div className='mt-6'>
        <h3 className='text-xl font-semibold'>Configuration</h3>
        <p className='mt-1 text-sm text-zinc-500'>
          Configure your domain to use the following settings.
        </p>

        <div className='mt-4 flex items-start gap-3'>
          <Checkbox
            id={clickTrackingCheckboxId}
            disabled={!isIdentityVerified || updateConfigurationSet.isPending}
            checked={identity.clickTracking}
            onCheckedChange={(checked) => {
              // intermediate state means the user clicked on the checkbox
              // but the state is not yet updated
              if (checked === 'indeterminate') {
                return;
              }

              toast.promise(
                updateConfigurationSet.mutateAsync({
                  clickTracking: checked,
                }),
                {
                  loading: 'Updating Configuration Set...',
                  success: 'Configuration Set Updated!',
                  error: (err) => {
                    return (
                      err?.message || 'Failed to update Configuration Set!'
                    );
                  },
                },
              );
            }}
          />
          <div>
            <label
              htmlFor={clickTrackingCheckboxId}
              className='block max-w-max text-lg font-semibold leading-none text-zinc-200 hover:text-zinc-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
            >
              Click Tracking
            </label>
            <p className='mt-1 text-balance text-sm text-zinc-500'>
              For every link in your email, we will modify the links in the
              email, and whenver the user clicks on the link, we will track the
              click.
            </p>
          </div>
        </div>

        <div className='mt-4 flex items-start gap-3'>
          <Checkbox
            id={openTrackingCheckboxId}
            disabled={!isIdentityVerified || updateConfigurationSet.isPending}
            checked={identity.openTracking}
            onCheckedChange={(checked) => {
              // intermediate state means the user clicked on the checkbox
              // but the state is not yet updated
              if (checked === 'indeterminate') {
                return;
              }

              toast.promise(
                updateConfigurationSet.mutateAsync({
                  openTracking: checked,
                }),
                {
                  loading: 'Updating Configuration Set...',
                  success: 'Configuration Set Updated!',
                  error: (err) => {
                    return (
                      err?.message || 'Failed to update Configuration Set!'
                    );
                  },
                },
              );
            }}
          />
          <div>
            <label
              htmlFor={openTrackingCheckboxId}
              className='block max-w-max text-lg font-semibold leading-none text-zinc-200 hover:text-zinc-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
            >
              Open Tracking
            </label>
            <p className='mt-1 text-balance text-sm text-zinc-500'>
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
