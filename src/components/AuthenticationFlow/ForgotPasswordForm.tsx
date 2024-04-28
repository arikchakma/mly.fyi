import { httpPost } from '@/lib/http';
import { queryClient } from '@/utils/query-client';
import { useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../Interface/Button';
import { Input } from '../Interface/Input';

type ForgotPasswordFormProps = {};

export function ForgotPasswordForm(props: ForgotPasswordFormProps) {
  const [email, setEmail] = useState<string>('');

  const forgotPassword = useMutation(
    {
      mutationKey: ['forgot-password', email],
      mutationFn: () => {
        return httpPost(`/api/v1/auth/forgot-password`, {
          email,
        });
      },
      onSuccess: () => {
        setEmail('');
      },
      onError: (error) => {
        // @todo use proper types
        if ((error as any).type === 'user_not_verified') {
          window.location.href = `/verification-pending?email=${encodeURIComponent(
            email,
          )}`;
          return;
        }
      },
    },
    queryClient,
  );

  const handleFormSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    toast.promise(forgotPassword.mutateAsync(), {
      loading: 'Please wait...',
      success: 'Check your email for the reset link.',
      error: (error) => {
        return error?.message || 'Something went wrong.';
      },
    });
  };

  const isLoading = forgotPassword.status === 'pending';

  return (
    <form className='w-full' onSubmit={handleFormSubmit}>
      <label htmlFor='email' className='sr-only'>
        Email address
      </label>
      <Input
        name='email'
        type='email'
        autoComplete='email'
        required
        placeholder='Email Address'
        value={email}
        onInput={(e) => setEmail(String((e.target as any).value))}
      />

      <Button type='submit' disabled={isLoading} className='mt-3'>
        {isLoading ? (
          <Loader2 className='animate-spin w-4 h-4 stroke-[2.5px]' />
        ) : (
          'Continue'
        )}
      </Button>
    </form>
  );
}
