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
import { Button } from '../Interface/Button.tsx';
import { Input } from '../Interface/Input.tsx';
import { Label } from '../Interface/Label.tsx';
import { TimezonePopover } from './TimezonePopover';

export function ProjectForm() {
  const [name, setName] = useState<string>('');
  const [url, setUrl] = useState<string>('');
  const [timezone, setTimezone] = useState(DateTime.local().zoneName);

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
        url,
        timezone,
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
      <Label htmlFor={nameFieldId} aria-required={true}>
        Project Name
      </Label>
      <Input
        id={nameFieldId}
        type='text'
        required
        className='mt-2'
        placeholder='Project Name'
        min={3}
        value={name}
        onInput={(e) => setName(String((e.target as any).value))}
      />
      <Label htmlFor={urlFieldId} className='mt-4' aria-required={true}>
        Project Website
      </Label>
      <Input
        id={urlFieldId}
        type='url'
        required
        className='mt-2'
        placeholder='Project Website'
        value={url}
        onInput={(e) => setUrl(String((e.target as any).value))}
      />

      <Label htmlFor='timezone-selector' className='mt-4 mb-2'>
        Timezone
      </Label>

      <TimezonePopover
        timezoneId={timezone}
        onTimezoneChange={(timezone) => setTimezone(timezone.id)}
      />

      <Button type='submit' disabled={isLoading} className='mt-4'>
        {isLoading ? 'Please wait...' : 'Create Project'}
      </Button>
    </form>
  );
}
