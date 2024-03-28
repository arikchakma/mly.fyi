import { redirectAuthSuccess, setAuthToken } from '@/lib/jwt-client.ts';
import { queryClient } from '@/utils/query-client.ts';
import { useMutation } from '@tanstack/react-query';
import { Ban, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { httpPost } from '../../lib/http.ts';

type TriggerVerifyAccountProps = {
  code: string;
};

export function TriggerVerifyAccount(props: TriggerVerifyAccountProps) {
  const { code } = props;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const triggerVerify = useMutation(
    {
      mutationKey: ['v1-verify-account'],
      mutationFn: async () => {
        return httpPost<{ token: string }>(`/api/v1/auth/verify-account`, {
          code,
        });
      },
      onSuccess: (data) => {
        const token = data?.token;
        if (!token) {
          setError('Something went wrong. Please try again.');
          setIsLoading(false);
          return;
        }

        setAuthToken(token);
        redirectAuthSuccess();
      },
      onError: (error) => {
        setError(error?.message || 'Something went wrong. Please try again.');
        setIsLoading(false);
      },
    },
    queryClient,
  );

  useEffect(() => {
    triggerVerify.mutate();
  }, []);

  const loadingMessage = isLoading && (
    <div className='flex items-center gap-3 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 font-medium text-zinc-50'>
      <Loader2 className='mx-auto h-5 w-5 animate-spin stroke-[3]' />
      <h3 className='text-base font-medium'>
        Please wait while we verify you..
      </h3>
    </div>
  );

  const errorMessage = error && !isLoading && (
    <div className='flex items-center gap-3 rounded-md border border-red-500 bg-red-700 px-3 py-1.5 font-medium text-white'>
      <Ban className='mx-auto h-5 w-5 stroke-[3]' />
      <h3 className='text-base font-medium'>{error}</h3>
    </div>
  );

  return (
    <div className='mx-auto flex max-w-md flex-col items-center pt-0 sm:pt-12'>
      <div className='mx-auto max-w-md text-center'>
        {loadingMessage}
        {errorMessage}
      </div>
    </div>
  );
}
