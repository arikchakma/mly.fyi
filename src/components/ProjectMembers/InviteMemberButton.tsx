import { httpPost } from '@/lib/http.ts';
import { queryClient } from '@/utils/query-client.ts';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '../Interface/Button.tsx';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../Interface/Dialog.tsx';
import { Input } from '../Interface/Input.tsx';
import {
  type AllowedProjectMemberRole,
  RoleDropdown,
} from './RoleDropdown.tsx';

type InviteMemberButtonProps = {
  projectId: string;
};

export function InviteMemberButton(props: InviteMemberButtonProps) {
  const { projectId } = props;

  const [isOpen, setIsOpen] = useState(false);
  const [selectedRole, setSelectedRole] =
    useState<AllowedProjectMemberRole>('viewer');
  const [email, setEmail] = useState('');

  const inviteMember = useMutation(
    {
      mutationKey: ['invite-member', projectId],
      mutationFn: async () => {
        return await httpPost(`/api/v1/projects/${projectId}/members/invite`, {
          email,
          role: selectedRole,
        });
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['project-members', projectId],
        });
        setEmail('');
        setIsOpen(false);
      },
    },
    queryClient,
  );

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    toast.promise(inviteMember.mutateAsync(), {
      loading: 'Inviting member...',
      success: 'Invited successfully',
      error: (error) => {
        return error?.message || 'Something went wrong';
      },
    });
  };

  const isLoading = inviteMember.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant='outline' className='border-dashed'>
          + Invite Member
        </Button>
      </DialogTrigger>
      <DialogContent className='max-w-sm p-4'>
        <DialogHeader>
          <DialogTitle>Invite Member</DialogTitle>
          <DialogDescription>
            Enter the email and role below to invite a member.
          </DialogDescription>
        </DialogHeader>

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
              value={email}
              onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
            />

            <RoleDropdown
              selectedRole={selectedRole}
              setSelectedRole={setSelectedRole}
            />
          </div>

          <div className='grid grid-cols-2 items-center gap-2 mt-2'>
            <DialogClose asChild>
              <Button type='button' variant='outline' disabled={isLoading}>
                Cancel
              </Button>
            </DialogClose>
            <Button type='submit' disabled={isLoading || !email}>
              {isLoading ? 'Please wait ..' : 'Invite'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
