import type { Project } from '@/db/types.ts';
import { httpPatch } from '@/lib/http.ts';
import type {
  ConfigureProjectBody,
  ConfigureProjectRequest,
} from '@/pages/api/v1/projects/[projectId]/configure.ts';
import { queryClient } from '@/utils/query-client.ts';
import { useMutation } from '@tanstack/react-query';
import { Loader2, SlidersHorizontal } from 'lucide-react';
import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import { Input } from '../Interface/Input.tsx';
import { Label } from '../Interface/Label.tsx';

type ProjectConfigurationFormProps = {
  projectId: string;
  project?: Pick<Project, 'accessKeyId' | 'secretAccessKey' | 'region'>;
};

export function ProjectConfigurationForm(props: ProjectConfigurationFormProps) {
  const { projectId, project: defaultValues } = props;

  const [accessKeyId, setAccessKey] = useState<string>(
    defaultValues?.accessKeyId || '',
  );
  const [secretAccessKey, setSecretAccessKey] = useState<string>(
    defaultValues?.secretAccessKey || '',
  );
  const [region, setRegion] = useState<string>(defaultValues?.region || '');

  const updateProjectConfiguration = useMutation(
    {
      mutationKey: ['update-project-configuration', projectId],
      mutationFn: (data: ConfigureProjectBody) => {
        return httpPatch<ConfigureProjectRequest>(
          `/api/v1/projects/${projectId}/configure`,
          data,
        );
      },
      onSuccess: (data) => {},
    },
    queryClient,
  );

  const handleFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    toast.promise(
      updateProjectConfiguration.mutateAsync({
        accessKeyId,
        secretAccessKey,
        region,
      }),
      {
        loading: 'Updating Configuration...',
        success: 'Configuration updated successfully!',
        error: (error) => {
          console.error(error);
          return (
            error?.message || 'Something went wrong. Please try again later.'
          );
        },
      },
    );
  };

  const isLoading = updateProjectConfiguration.status === 'pending';

  const accessKeyIdFieldId = `cfg:${useId()}`;
  const secretAccessKeyFieldId = `cfg:${useId()}`;
  const regionFieldId = `cfg:${useId()}`;

  return (
    <form className='w-full' onSubmit={handleFormSubmit}>
      <h2 className='mb-1 text-xl font-medium'>Project Configuration</h2>
      <p className='mb-4 text-sm text-zinc-500'>
        Configure your project settings
      </p>

      <div>
        <Label htmlFor={accessKeyIdFieldId} aria-required={true}>
          Access Key
        </Label>
        <Input
          id={accessKeyIdFieldId}
          type='text'
          required
          className='mt-2'
          placeholder='Access Key'
          min={3}
          value={accessKeyId}
          onInput={(e) => setAccessKey(String((e.target as any).value))}
          autoComplete='off'
          spellCheck={false}
        />
        <p className='mt-2 text-sm text-zinc-500'>Your AWS Access Key ID</p>
      </div>

      <div>
        <Label
          htmlFor={secretAccessKeyFieldId}
          aria-required={true}
          className='mt-4'
        >
          Secret Access Key
        </Label>
        <Input
          id={secretAccessKeyFieldId}
          type='password'
          required
          className='mt-2'
          placeholder='Secret Access Key'
          value={secretAccessKey}
          onInput={(e) => setSecretAccessKey(String((e.target as any).value))}
          autoComplete='off'
          spellCheck={false}
        />
        <p className='mt-2 text-sm text-zinc-500'>Your AWS Secret Access Key</p>
      </div>

      <div>
        <Label htmlFor={regionFieldId} aria-required={true} className='mt-4'>
          Region
        </Label>
        <Input
          id={regionFieldId}
          type='text'
          className='mt-2'
          placeholder='us-west-2'
          value={region}
          onInput={(e) => setRegion(String((e.target as any).value))}
          autoComplete='off'
          spellCheck={false}
          required
        />
        <p className='mt-2 text-sm text-zinc-500'>
          The AWS region where your project is hosted
        </p>
      </div>

      <button
        type='submit'
        disabled={isLoading}
        className='mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 p-2 text-sm font-medium text-zinc-50 outline-none focus:border-none focus:ring-2 focus:ring-zinc-500 active:outline-none disabled:cursor-not-allowed disabled:opacity-60'
      >
        {isLoading ? (
          <Loader2 size={14} className='animate-spin stroke-[3px]' />
        ) : (
          'Update Configuration'
        )}
      </button>
    </form>
  );
}
