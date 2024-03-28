import type { FormEvent } from 'react';
import { useState, useId } from 'react';
import { httpPost } from '../../lib/http.ts';
import { toast } from 'sonner';
import { DateTime } from 'luxon';
import { useMutation } from '@tanstack/react-query';
import type {
  CreateProjectBody,
  CreateProjectResponse,
} from '../../pages/api/v1/projects/create.ts';
import { TimezoneSelect } from '../TimezoneSelect.tsx';
import { queryClient } from '@/utils/query-client.ts';

export function ProjectForm() {
  const [name, setName] = useState<string>('');
  const [url, setUrl] = useState<string>('');
  const [timezone, setTimezone] = useState<string>(DateTime.local().zoneName);

  const createProject = useMutation(
    {
      mutationKey: ['create-project'],
      mutationFn: (data: CreateProjectBody) => {
        return httpPost<CreateProjectResponse>('/api/v1/projects/create', data);
      },
      onSuccess: (data) => {
        window.location.href = `/projects/${data.id}`;
      },
    },
    queryClient,
  );

  const handleFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    toast.promise(
      createProject.mutateAsync({
        name,
        timezone,
        url,
      }),
      {
        loading: 'Creating project...',
        success: 'Project created successfully',
        error: (error) => {
          console.error(error);
          return (
            error?.message || 'Something went wrong. Please try again later.'
          );
        },
      },
    );
  };

  const isLoading = createProject.status === 'pending';

  const nameFieldId = `pjt:${useId()}`;
  const urlFieldId = `pjt:${useId()}`;

  return (
    <form className='w-full' onSubmit={handleFormSubmit}>
      <label
        htmlFor={nameFieldId}
        className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
      >
        Project Name
      </label>
      <input
        id={nameFieldId}
        type='text'
        required
        className='mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 outline-none placeholder:text-zinc-400 focus:border-zinc-600'
        placeholder='Project Name'
        min={3}
        value={name}
        onInput={(e) => setName(String((e.target as any).value))}
      />
      <label
        htmlFor={urlFieldId}
        className='mt-4 block text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
      >
        Project Website
      </label>
      <input
        id={urlFieldId}
        type='url'
        required
        className='mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 outline-none placeholder:text-zinc-400 focus:border-zinc-600'
        placeholder='Project Website'
        value={url}
        onInput={(e) => setUrl(String((e.target as any).value))}
      />

      <label
        htmlFor='text'
        className='mt-4 block text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
      >
        Timezone
      </label>

      <TimezoneSelect value={timezone} setValue={setTimezone} />

      <button
        type='submit'
        disabled={isLoading}
        className='mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 p-2 text-sm font-medium text-zinc-50 outline-none focus:ring-2 focus:ring-[#333] focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60'
      >
        {isLoading ? 'Please wait...' : 'Create Project'}
      </button>
    </form>
  );
}
