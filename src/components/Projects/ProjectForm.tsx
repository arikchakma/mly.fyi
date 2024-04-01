import { queryClient } from '@/utils/query-client.ts';
import { useMutation } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import type { FormEvent } from 'react';
import { useId, useState } from 'react';
import { toast } from 'sonner';
import { httpPost } from '../../lib/http.ts';
import type {
  CreateProjectBody,
  CreateProjectResponse,
} from '../../pages/api/v1/projects/create.ts';
import { Input } from '../Interface/Input.tsx';
import { TimezonePopover } from './TimezonePopover';

export function ProjectForm() {
  const [name, setName] = useState<string>('');
  const [url, setUrl] = useState<string>('');
  const [timezone, setTimezone] = useState<string>('');

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
      <Input
        id={nameFieldId}
        type='text'
        required
        className='mt-1'
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
      <Input
        id={urlFieldId}
        type='url'
        required
        className='mt-2'
        placeholder='Project Website'
        value={url}
        onInput={(e) => setUrl(String((e.target as any).value))}
      />

      <label
        htmlFor='timezone-selector'
        className='mt-4 mb-2 block text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
      >
        Timezone
      </label>

      <TimezonePopover
        timezoneId={timezone}
        onTimezoneChange={(timezone) => setTimezone(timezone.id)}
      />

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
