import { queryClient } from '@/utils/query-client.ts';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { httpDelete } from '@/lib/http.ts';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../Interface/AlertDialog.tsx';
import { Button } from '../Interface/Button.tsx';

type LeaveProjectButtonProps = {
  projectId: string;
};

export function LeaveProjectButton(props: LeaveProjectButtonProps) {
  const { projectId } = props;

  const leaveProject = useMutation(
    {
      mutationKey: ['leave-project', projectId],
      mutationFn: async () => {
        return httpDelete(`/api/v1/projects/${projectId}/members/leave`, {});
      },
    },
    queryClient,
  );

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant='destructive'
          className='w-auto bg-red-950 border-red-900 text-red-100'
          size='sm'
        >
          Leave project
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent
        className='max-w-sm gap-6 p-4'
        onOpenAutoFocus={(e) => {
          e.preventDefault();
        }}
      >
        <AlertDialogHeader className='space-y-1'>
          <AlertDialogTitle>Leave Project</AlertDialogTitle>
          <AlertDialogDescription className='text-balance text-zinc-400'>
            This action cannot be undone. This will permanently remove you from
            the project.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              toast.promise(leaveProject.mutateAsync(), {
                loading: 'Leaving project..',
                success: (data) => {
                  window.setTimeout(() => {
                    window.location.href = '/project';
                  }, 700);

                  return 'Project left';
                },
                error: (e) => {
                  return e?.message || 'Failed to leave project';
                },
              });
            }}
          >
            Leave
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
