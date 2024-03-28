import React from 'react';
import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { httpDelete } from '../../lib/http';
import { queryClient } from '../../utils/query-client';
import { cn } from '../../utils/classname';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../Interface/AlertDialog';
import { Input } from '../Interface/Input';
import { Label } from '../Interface/Label';
import { Button } from '../Interface/Button';

type DeleteApiKeyProps = {
  projectId: string;
  apiKeyId: string;
  apiKeyName: string;
  label?: string;
  className?: string;
  iconSize?: number;
};

export function DeleteApiKey(props: DeleteApiKeyProps) {
  const {
    projectId,
    apiKeyId,
    apiKeyName,
    label,
    className,
    iconSize = 16,
  } = props;

  const confirmInputFieldId = `idt${useId()}`;
  const [isOpen, setIsOpen] = useState(false);

  const deleteIdentity = useMutation(
    {
      mutationKey: ['project-api-keys', projectId, apiKeyId, 'delete'],
      mutationFn: () => {
        return httpDelete(
          `/api/v1/projects/${projectId}/keys/${apiKeyId}/delete`,
          {},
        );
      },
      onSuccess: () => {
        queryClient.invalidateQueries();
        setIsOpen(false);
      },
    },
    queryClient,
  );

  const { isPending } = deleteIdentity;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = e.currentTarget;
    const confirmIdentityDomain = form[confirmInputFieldId].value;

    if (!confirmIdentityDomain || confirmIdentityDomain !== 'CONFIRM') {
      toast.error('Please type CONFIRM to continue');
      return;
    }

    toast.promise(deleteIdentity.mutateAsync(), {
      loading: 'Deleting Api Key...',
      success: 'Api Key deleted successfully',
      error: (err) => {
        return err?.message || 'Something went wrong';
      },
    });
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <button
          disabled={isPending}
          className={cn(
            'inline-flex items-center border-none text-sm text-zinc-400 outline-none hover:text-zinc-50 focus:text-zinc-50 focus:outline-none disabled:opacity-70',
            className,
          )}
        >
          {isPending ? (
            <Loader2 size={iconSize} className='animate-spin' />
          ) : (
            <Trash2 size={iconSize} />
          )}
          {label && <span>{label}</span>}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent className='max-w-sm gap-6 p-4'>
        <AlertDialogHeader className='space-y-1'>
          <AlertDialogTitle>Delete Identity</AlertDialogTitle>
          <AlertDialogDescription className='text-balance text-zinc-400'>
            This action cannot be undone. This will permanently delete the api
            key <strong className='text-zinc-200'>{apiKeyName}</strong>.
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
            />
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
            <Button type='submit' variant='destructive' disabled={isPending}>
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
