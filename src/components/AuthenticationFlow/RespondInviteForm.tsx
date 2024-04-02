import { httpGet, httpPatch } from '@/lib/http';
import { queryClient } from '@/utils/query-client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import type { GetProjectMemberInviteInfoResponse } from '../../pages/api/v1/projects/invitations/[inviteId]/index';
import { PageError } from '../Errors/PageError';
import { Button } from '../Interface/Button';
import { LoadingMessage } from '../LoadingMessage';

type ProjectMemberInviteInfo = {
  inviteId: string;
};

export function RespondInviteForm(props: ProjectMemberInviteInfo) {
  const { inviteId } = props;

  const [isRejecting, setIsRejecting] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);

  const { data: invite, error } = useQuery<GetProjectMemberInviteInfoResponse>(
    {
      queryKey: ['project-member-invite-info', inviteId],
      queryFn: async () => {
        return httpGet(`/api/v1/projects/invitations/${inviteId}`);
      },
    },
    queryClient,
  );

  const respondInvite = useMutation(
    {
      mutationKey: ['respond-invite', inviteId],
      mutationFn: (action: 'accept' | 'reject') => {
        return httpPatch(`/api/v1/projects/invitations/${inviteId}/respond`, {
          action,
        });
      },
      onError: () => {
        setIsAccepting(false);
        setIsRejecting(false);
      },
      onSuccess: (_, variables) => {
        if (variables === 'accept') {
          window.location.href = `/projects/${invite?.project?.id}`;
        } else if (variables === 'reject') {
          window.location.href = '/projects';
        }
      },
    },
    queryClient,
  );

  const handleRespondInvite = async (action: 'accept' | 'reject') => {
    if (action === 'accept') {
      setIsAccepting(true);
      setIsRejecting(false);
    } else {
      setIsRejecting(true);
      setIsAccepting(false);
    }

    toast.promise(respondInvite.mutateAsync(action), {
      loading: `${
        action === 'accept' ? 'Accepting' : 'Rejecting'
      } invitation...`,
      success: `Invitation ${action === 'accept' ? 'accepted' : 'rejected'}!`,
      error: (err) => {
        return err?.message || 'Something went wrong!';
      },
    });
  };

  if (error && !invite) {
    return (
      <PageError
        error={error?.message || 'Something went wrong!'}
        className='sm:pt-0'
      />
    );
  }

  if (!invite) {
    return <LoadingMessage message='Loading invite information...' />;
  }

  return (
    <div>
      <h2 className={'mb-1 text-2xl font-bold'}>Join Project</h2>
      <p className='mb-3 text-base text-zinc-600'>
        You have been invited to join the project&nbsp;
        <strong className='text-zinc-400'>{invite?.project?.name}</strong>.
      </p>

      <div className='grid grid-cols-2 gap-2'>
        <Button
          variant='destructive'
          onClick={() => {
            handleRespondInvite('reject');
          }}
        >
          Reject
        </Button>
        <Button
          onClick={() => {
            handleRespondInvite('accept');
          }}
        >
          Accept
        </Button>
      </div>
    </div>
  );
}
