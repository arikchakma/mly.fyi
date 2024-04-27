import { httpDelete } from '@/lib/http';
import { queryClient } from '@/utils/query-client';
import { useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../Interface/AlertDialog';
import { Button } from '../Interface/Button';
import { Checkbox } from '../Interface/Checkbox';
import { Input } from '../Interface/Input';
import { Label } from '../Interface/Label';

type DeleteProjectDialogProps = {
  projectName: string;
  projectId: string;
};

export function DeleteProjectDialog(props: DeleteProjectDialogProps) {
  const { projectId, projectName } = props;

  const [isOpen, setIsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [mode, setMode] = useState<'strict' | 'soft'>('soft');

  const confirmInputFieldId = `pjt${useId()}`;
  const modeInputFieldId = `pjt${useId()}`;

  const deleteProject = useMutation(
    {
      mutationKey: ['projects', projectId, 'delete'],
      mutationFn: () => {
        return httpDelete(
          `/api/v1/projects/${projectId}/delete?mode=${mode}`,
          {},
        );
      },
      onSuccess: () => {
        queryClient.invalidateQueries();
        window.location.href = '/';
      },
    },
    queryClient,
  );

  const { isPending } = deleteProject;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!confirmText || confirmText !== 'CONFIRM') {
      toast.error('Please type CONFIRM to continue');
      return;
    }

    toast.promise(deleteProject.mutateAsync(), {
      loading: 'Deleting Project...',
      success: 'Project deleted successfully',
      error: (err) => {
        return err?.message || 'Something went wrong';
      },
    });
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant='destructive'>Delete</Button>
      </AlertDialogTrigger>
      <AlertDialogContent className='max-w-sm gap-6 p-4'>
        <AlertDialogHeader className='space-y-1'>
          <AlertDialogTitle>Delete Project</AlertDialogTitle>
          <AlertDialogDescription className='text-balance text-zinc-400'>
            This action cannot be undone and all data associated with{' '}
            <strong className='text-zinc-200'>{projectName}</strong> will be
            lost permanently.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form onSubmit={handleSubmit}>
          <div>
            <Label htmlFor={confirmInputFieldId}>
              Type <strong>CONFIRM</strong> to continue
            </Label>

            <Input
              autoFocus
              id={confirmInputFieldId}
              type='text'
              placeholder='CONFIRM'
              className='mt-2'
              required
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
          </div>

          <div className='mt-2 flex items-center gap-2 border rounded-md p-2 border-zinc-800'>
            <Checkbox
              id={modeInputFieldId}
              checked={mode === 'strict'}
              onCheckedChange={(checked) => {
                setMode(checked ? 'strict' : 'soft');
              }}
            />
            <Label htmlFor={modeInputFieldId} className='text-xs'>
              Remove identities from SES
            </Label>
          </div>

          <div className='mt-2 grid grid-cols-2 gap-2'>
            <Button
              type='button'
              variant='outline'
              disabled={isPending}
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type='submit'
              variant='destructive'
              disabled={isPending || confirmText !== 'CONFIRM'}
            >
              {isPending ? (
                <Loader2 size={16} className='animate-spin stroke-[3px]' />
              ) : (
                'Continue'
              )}
            </Button>
          </div>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
