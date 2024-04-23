import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryClient } from '@/utils/query-client';
import { httpPost } from '@/lib/http';
import type {
  CreateProjectApiKeyBody,
  CreateProjectApiKeyResponse,
} from '@/pages/api/v1/projects/[projectId]/keys/create';
import { CopyableTableField } from '../ProjectIdentities/CopyableTableField';
import { Loader2 } from 'lucide-react';

type ProjectApiKeyFormProps = {
  projectId: string;
};

export function ProjectApiKeyForm(props: ProjectApiKeyFormProps) {
  const { projectId } = props;

  const nameFieldId = `key:${useId()}`;

  const [name, setName] = useState('');
  const [key, setKey] = useState('');

  const createProjectApiKey = useMutation(
    {
      mutationKey: ['project-api-key', name],
      mutationFn: (data: CreateProjectApiKeyBody) => {
        return httpPost<CreateProjectApiKeyResponse>(
          `/api/v1/projects/${projectId}/keys/create`,
          data,
        );
      },
      onSuccess: (data) => {
        setName('');
        setKey(data.key);
      },
    },
    queryClient,
  );

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    toast.promise(createProjectApiKey.mutateAsync({ name }), {
      loading: 'Creating key...',
      success: 'Key created successfully!',
      error: (err) => {
        return err?.message || 'Something went wrong';
      },
    });
  };

  const isLoading = createProjectApiKey.isPending;

  if (key && !isLoading) {
    return (
      <div className='mx-auto w-full max-w-sm'>
        <h2 className='mb-1 text-xl font-medium'>Key Created</h2>
        <p className='mb-4 text-sm text-zinc-500'>
          Your key has been created successfully.
        </p>
        <CopyableTableField
          className='mt-1 h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-left outline-none placeholder:text-zinc-400 focus:border-zinc-600'
          value={key}
        />
        <p className='mt-2 text-sm text-zinc-500'>
          Make sure to copy this key as it won't be shown again.
        </p>
        <a
          href={`/projects/${projectId}/keys`}
          className='mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 p-2 text-sm font-medium text-zinc-50 outline-none focus:border-none focus:ring-2 focus:ring-zinc-500 active:outline-none disabled:cursor-not-allowed disabled:opacity-60'
        >
          Go back to keys
        </a>
      </div>
    );
  }

  return (
    <form className='mx-auto w-full max-w-sm' onSubmit={handleSubmit}>
      <h2 className='mb-1 text-xl font-medium'>Create New Key</h2>
      <p className='mb-4 text-sm text-zinc-500'>
        Fill the details below to get started
      </p>
      <div>
        <label
          htmlFor={nameFieldId}
          aria-required={true}
          data-content-required='*'
          className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 aria-required:after:ml-0.5 aria-required:after:mr-0.5 aria-required:after:text-red-600 aria-required:after:content-[attr(data-content-required)]'
        >
          Name
        </label>
        <input
          name={nameFieldId}
          id={nameFieldId}
          spellCheck={false}
          autoComplete='off'
          type='text'
          required
          className='mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 outline-none placeholder:text-zinc-400 focus:border-zinc-600'
          placeholder='Transaction Service Key'
          min={3}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <p className='mt-2 text-sm text-zinc-500'>
          No need to be unique, just a friendly name for your key.
        </p>
      </div>

      <button
        type='submit'
        disabled={isLoading}
        className='mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 p-2 text-sm font-medium text-zinc-50 outline-none focus:border-none focus:ring-2 focus:ring-zinc-500 active:outline-none disabled:cursor-not-allowed disabled:opacity-60'
      >
        {isLoading ? (
          <Loader2 size={16} className='animate-spin stroke-[3px]' />
        ) : (
          'Create Key'
        )}
      </button>
    </form>
  );
}
