import { cn } from '@/utils/classname';
import { Settings2 } from 'lucide-react';
import { buttonVariants } from '../Interface/Button';

type ProjectConfigurationPendingProps = {
  projectId: string;
};

export function ProjectConfigurationPending(
  props: ProjectConfigurationPendingProps,
) {
  const { projectId } = props;

  return (
    <div className='mt-16 flex flex-col items-center justify-center'>
      <h2 className='mb-1 text-2xl font-bold'>Pending Configuration</h2>
      <div className='text-sm sm:text-base'>
        <p className='text-zinc-400'>
          Please finish setting up your project to continue.
        </p>
        <div className='mt-5 text-center'>
          <a
            href={`/projects/${projectId}/settings`}
            className={cn(
              buttonVariants({
                variant: 'default',
                size: 'default',
              }),
            )}
          >
            <Settings2 className='w-4 h-4 stroke-[2.5px]' />
            Configure Project
          </a>
        </div>
      </div>
    </div>
  );
}
