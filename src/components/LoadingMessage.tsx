import { Loader2 } from 'lucide-react';
import React from 'react';

type LoadingMessageProps = {
  message?: string;
};

export function LoadingMessage(props: LoadingMessageProps) {
  const { message = 'Please wait..' } = props;

  return (
    <div className='mx-auto max-w-max'>
      <div className='flex items-center gap-3 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 font-medium text-zinc-50'>
        <Loader2 className='h-5 w-5 animate-spin stroke-[3]' />
        <h3 className='text-base font-medium'>{message}</h3>
      </div>
    </div>
  );
}
