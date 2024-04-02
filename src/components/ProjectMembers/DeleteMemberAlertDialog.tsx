import { httpDelete } from '@/lib/http.ts';
import { queryClient } from '@/utils/query-client.ts';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { GetProjectMembersResponse } from '../../pages/api/v1/projects/[projectId]/members/index.ts';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../Interface/AlertDialog';

type DeleteMemberAlertDialogProps = {
  isDeleting: boolean;
  setIsDeleting: (value: boolean) => void;
  member: GetProjectMembersResponse[number];
};

export function DeleteMemberAlertDialog(props: DeleteMemberAlertDialogProps) {
  const { isDeleting, setIsDeleting, member } = props;

  const deleteMember = useMutation(
    {
      mutationKey: ['delete-member', member.id],
      mutationFn: () => {
        return httpDelete(
          `/api/v1/projects/${member.projectId}/members/${member.id}/delete`,
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
    <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
      <AlertDialogContent
        onOpenAutoFocus={(e) => {
          e.preventDefault();
        }}
        className='max-w-sm'
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Member</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete{' '}
            <strong>{member.invitedEmail}</strong> from the project?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              toast.promise(deleteMember.mutateAsync(), {
                loading: 'Deleting member..',
                success: 'Member deleted',
                error: (e) => {
                  return e?.message || 'Failed to delete member';
                },
              });
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
