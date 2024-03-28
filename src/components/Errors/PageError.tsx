import { cn } from '@/utils/classname';
import { Ban } from 'lucide-react';

type PageErrorProps = {
  error?: string;
  className?: string;
};

export function PageError(props: PageErrorProps) {
  const { error = 'Something went wrong', className } = props;

  return (
    <div
      className={cn('mx-auto flex max-w-md flex-col items-center', className)}
    >
      <div className='mx-auto max-w-md text-center'>
        <div className='flex items-center gap-3 rounded-md border border-red-500 bg-red-700 px-3 py-1.5 font-medium text-white'>
          <Ban className='mx-auto h-5 w-5 stroke-[3]' />
          <h3 className='text-base font-medium'>{error}</h3>
        </div>
      </div>
    </div>
  );
}
