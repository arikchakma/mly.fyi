import { useMutation } from '@tanstack/react-query';
import React from 'react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { httpPost } from '../../lib/http';
import { redirectAuthSuccess, setAuthToken } from '../../lib/jwt-client';
import { queryClient } from '../../utils/query-client';

type EmailLoginFormProps = {};

export function EmailLoginForm(props: EmailLoginFormProps) {
  const [email, setEmail] = useState<string>('');

  const login = useMutation(
    {
      mutationKey: ['forgot-password', email],
      mutationFn: () => {
        return httpPost<{ token: string }>(`/api/v1/auth/forgot-password`, {
          email,
        });
      },
      onSuccess: (data) => {
        const token = data?.token;
        if (!token) {
          toast.error('Something went wrong. Please try again.');
          return;
        }

        setAuthToken(token);
        redirectAuthSuccess();
      },
      onError: (error) => {
        // Implement the error handling logic for the login mutation
        //   // @todo use proper types
        //   if ((error as any).type === 'user_not_verified') {
        //     window.location.href = `/verification-pending?email=${encodeURIComponent(
        //       email,
        //     )}`;
        //     return;
        //   }
      },
    },
    queryClient,
  );

  const handleFormSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    toast.promise(login.mutateAsync(), {
      loading: 'Please wait...',
      error: (error) => {
        return error?.message || 'Something went wrong.';
      },
    });
  };

  const isLoading = login.status === 'pending';

  return (
    <form className='w-full' onSubmit={handleFormSubmit}>
      <label htmlFor='email' className='sr-only'>
        Email address
      </label>
      <input
        name='email'
        type='email'
        autoComplete='email'
        required
        className='block w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 outline-none placeholder:text-zinc-400 focus:border-zinc-600'
        placeholder='Email Address'
        value={email}
        onInput={(e) => setEmail(String((e.target as any).value))}
      />

      <button
        type='submit'
        disabled={isLoading}
        className='inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 p-2 text-sm font-medium text-zinc-50 outline-none focus:ring-2 focus:ring-[#333] focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60'
      >
        {isLoading ? 'Please wait...' : 'Continue'}
      </button>
    </form>
  );
}
