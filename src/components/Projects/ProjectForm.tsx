import type { Project } from '@/db/types.ts';
import { httpPatch, httpPost } from '@/lib/http.ts';
import type {
  CreateProjectBody,
  CreateProjectResponse,
} from '@/pages/api/v1/projects/create.ts';
import { queryClient } from '@/utils/query-client.ts';
import { useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { DateTime } from 'luxon';
import type { FormEvent } from 'react';
import { useId, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../Interface/Button.tsx';
import { Input } from '../Interface/Input.tsx';
import { Label } from '../Interface/Label.tsx';
import { TimezonePopover } from './TimezonePopover';

type ProjectFormProps = {
  action?: 'create' | 'update';
  project?: Pick<Project, 'id' | 'name' | 'url' | 'timezone'>;
};

export function ProjectForm(props: ProjectFormProps) {
  const { action = 'create', project: defaultValues } = props;

  const [name, setName] = useState<string>(defaultValues?.name || '');
  const [url, setUrl] = useState<string>(defaultValues?.url || '');
  const [timezone, setTimezone] = useState(
    defaultValues?.timezone || DateTime.local().zoneName,
  );

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

  const updateProject = useMutation(
    {
      mutationKey: ['update-project', defaultValues?.id],
      mutationFn: (data: CreateProjectBody) => {
        return httpPatch<CreateProjectResponse>(
          `/api/v1/projects/${defaultValues?.id}/update`,
          data,
        );
      },
    },
    queryClient,
  );

  const handleFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (action === 'update' && defaultValues?.id) {
      return toast.promise(
        updateProject.mutateAsync({
          name,
          url,
          timezone,
        }),
        {
          loading: 'Updating project...',
          success: 'Project updated successfully',
          error: (error) => {
            console.error(error);
            return (
              error?.message || 'Something went wrong. Please try again later.'
            );
          },
        },
      );
    } else {
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
    }
  };

  const isLoading =
    createProject.status === 'pending' || updateProject.status === 'pending';

  const nameFieldId = `pjt:${useId()}`;
  const urlFieldId = `pjt:${useId()}`;

  return (
    <form className='w-full' onSubmit={handleFormSubmit}>
      <h2 className='mb-1 text-xl font-medium'>
        {action === 'update' ? 'Update' : 'Create'} Project
      </h2>
      <p className='mb-4 text-sm text-zinc-500'>
        {action === 'update'
          ? 'Fill the details below to update'
          : 'Fill the details below to get started'}
      </p>

      <Label htmlFor={nameFieldId} aria-required={true}>
        Name
      </Label>
      <Input
        id={nameFieldId}
        type='text'
        required
        className='mt-2'
        placeholder='mly.fyi'
        min={3}
        value={name}
        onInput={(e) => setName(String((e.target as any).value))}
      />
      <Label htmlFor={urlFieldId} className='mt-4' aria-required={true}>
        Website
      </Label>
      <Input
        id={urlFieldId}
        type='url'
        required
        className='mt-2'
        placeholder='https://mly.fyi'
        value={url}
        onInput={(e) => setUrl(String((e.target as any).value))}
      />

      <Label
        htmlFor='timezone-selector'
        className='mt-4 mb-2'
        aria-required={true}
      >
        Timezone
      </Label>

      <TimezonePopover
        timezoneId={timezone}
        onTimezoneChange={(timezone) => setTimezone(timezone.id)}
      />

      <Button type='submit' disabled={isLoading} className='mt-4'>
        {isLoading ? (
          <Loader2 size={16} className='animate-spin stroke-[3px]' />
        ) : (
          <>{action === 'update' ? 'Update Project' : 'Create Project'}</>
        )}
      </Button>
    </form>
  );
}
