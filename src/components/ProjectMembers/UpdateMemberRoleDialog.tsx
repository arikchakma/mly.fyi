import { httpPatch } from '@/lib/http.ts';
import { queryClient } from '@/utils/query-client.ts';
import { useMutation } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import type { GetProjectMembersResponse } from '@/pages/api/v1/projects/[projectId]/members/index.ts';
import { Button } from '../Interface/Button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../Interface/Dialog';
import { Input } from '../Interface/Input';
import { RoleDropdown } from './RoleDropdown';

type UpdateMemberRoleDialogProps = {
  member: GetProjectMembersResponse[number];
  open: boolean;
  setIsOpen: (open: boolean) => void;
};

export function UpdateMemberRoleDialog(props: UpdateMemberRoleDialogProps) {
  const { member, open, setIsOpen } = props;

  const [updatedRole, setUpdatedRole] = useState(member.role);

  const updateMemberRole = useMutation(
    {
      mutationKey: ['update-member-role', member.id],
      mutationFn: () => {
        return httpPatch(
          `/api/v1/projects/${member.projectId}/members/${member.id}/update`,
          {
            role: updatedRole,
          },
        );
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['project-members', member.projectId],
        });
        setIsOpen(false);
      },
    },
    queryClient,
  );

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    toast.promise(updateMemberRole.mutateAsync(), {
      loading: 'Updating..',
      success: 'Role updated',
      error: (e) => {
        return e?.message || 'Failed to update role';
      },
    });
  };

  const isLoading = updateMemberRole.isPending;

  return (
    <Dialog open={open} onOpenChange={setIsOpen}>
      <DialogContent
        className='max-w-sm'
        onOpenAutoFocus={(e) => {
          e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Update Role</DialogTitle>
          <DialogDescription>
            Select the role to update for this member
          </DialogDescription>
        </DialogHeader>
        <div className='grid gap-4'>
          <form onSubmit={handleSubmit}>
            <div className='flex flex-col gap-2'>
              <Input
                type='email'
                name='invite-member'
                id='invite-member'
                className='mt-2'
                placeholder='Enter email address'
                required
                autoFocus
                value={member.invitedEmail}
                readOnly
              />

              <RoleDropdown
                selectedRole={updatedRole}
                setSelectedRole={setUpdatedRole}
              />
            </div>

            <div className='grid grid-cols-2 items-center gap-2 mt-2'>
              <DialogClose asChild>
                <Button type='button' variant='outline' disabled={isLoading}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type='submit' disabled={isLoading || !updatedRole}>
                {isLoading ? 'Please wait ..' : 'Update Role'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
