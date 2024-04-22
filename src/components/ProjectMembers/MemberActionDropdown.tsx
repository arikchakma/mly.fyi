import { sleep } from '@/helpers/promise.ts';
import type { GetProjectMembersResponse } from '@/pages/api/v1/projects/[projectId]/members/index.ts';
import { queryClient } from '@/utils/query-client.ts';
import { useMutation } from '@tanstack/react-query';
import { MoreVertical } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { httpDelete, httpPatch, httpPut } from '@/lib/http.ts';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../Interface/DropdownMenu.tsx';
import { DeleteMemberAlertDialog } from './DeleteMemberAlertDialog.tsx';
import { UpdateMemberRoleDialog } from './UpdateMemberRoleDialog.tsx';

type MemberActionDropdownProps = {
  isDisabled: boolean;
  allowUpdateRole: boolean;
  member: GetProjectMembersResponse[number];
};

export function MemberActionDropdown(props: MemberActionDropdownProps) {
  const { member, isDisabled = false, allowUpdateRole = true } = props;

  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const resendInvite = useMutation(
    {
      mutationKey: ['resend-invite', member.id],
      mutationFn: () => {
        return httpPatch(
          `/api/v1/projects/${member.projectId}/members/${member.id}/resend`,
          {},
        );
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['project-members', member.projectId],
        });
      },
    },
    queryClient,
  );

  return (
    <>
      <DeleteMemberAlertDialog
        member={member}
        isDeleting={isDeleting}
        setIsDeleting={setIsDeleting}
      />
      <UpdateMemberRoleDialog
        member={member}
        open={isUpdating}
        setIsOpen={setIsUpdating}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={isDisabled}>
          <button className='ml-2 flex items-center opacity-60 transition-opacity hover:opacity-100 focus:shadow-none focus:outline-0 disabled:cursor-not-allowed disabled:opacity-30'>
            <MoreVertical size={20} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' side={'bottom'} className='min-w-40'>
          {allowUpdateRole && (
            <DropdownMenuItem
              onSelect={(e) => {
                setIsUpdating(true);
              }}
            >
              Update Role
            </DropdownMenuItem>
          )}

          {['invited'].includes(member.status) && (
            <DropdownMenuItem
              asChild
              onSelect={(e) => {
                toast.promise(resendInvite.mutateAsync(), {
                  loading: 'Resending...',
                  success: 'Invite resent',
                  error: (error) => {
                    return error?.message || 'Failed to resend invite';
                  },
                });
              }}
            >
              <button className='flex w-full items-center justify-between'>
                Resend Invite
              </button>
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            onSelect={() => {
              setIsDeleting(true);
            }}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
