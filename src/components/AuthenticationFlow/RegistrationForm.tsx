import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { httpPost } from '../../lib/http';
import { queryClient } from '../../utils/query-client';
import type {
  RegisterResponse,
  RegisterBody,
} from '../../pages/api/v1/auth/register';
import { toast } from 'sonner';

type RegistrationFormProps = {};

export function RegistrationForm(props: RegistrationFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const register = useMutation(
    {
      mutationKey: ['register'],
      mutationFn: (data: RegisterBody) => {
        return httpPost<RegisterResponse>('/api/v1/auth/register', data);
      },
      onSuccess: () => {
        window.location.href = `/verification-pending?email=${encodeURIComponent(
          email,
        )}`;
      },
    },
    queryClient,
  );

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    toast.promise(register.mutateAsync({ email, password, name }), {
      loading: 'Please wait...',
      success: 'Please check your email to verify your account.',
      error: (err) => {
        return err?.message || 'Something went wrong. Please try again later.';
      },
    });
  };

  const isLoading = register.status === 'pending';

  return (
    <form className='flex w-full flex-col gap-2' onSubmit={onSubmit}>
      <label htmlFor='name' className='sr-only'>
        Name
      </label>
      <input
        name='name'
        type='text'
        autoComplete='name'
        min={3}
        max={50}
        required
        className='block w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 outline-none placeholder:text-zinc-400 focus:border-zinc-600'
        placeholder='Full Name'
        value={name}
        onInput={(e) => setName(String((e.target as any).value))}
      />
      <label htmlFor='email' className='sr-only'>
        Email address
      </label>
      <input
        name='email'
        type='email'
        autoComplete='email'
        required
        className='w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 outline-none placeholder:text-zinc-400 focus:border-zinc-600'
        placeholder='Email Address'
        value={email}
        onInput={(e) => setEmail(String((e.target as any).value))}
      />
      <label htmlFor='password' className='sr-only'>
        Password
      </label>
      <input
        name='password'
        type='password'
        autoComplete='current-password'
        min={6}
        max={50}
        required
        className='w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 outline-none placeholder:text-zinc-400 focus:border-zinc-600'
        placeholder='Password'
        value={password}
        onInput={(e) => setPassword(String((e.target as any).value))}
      />

      <button
        type='submit'
        disabled={isLoading}
        className='inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 p-2 text-sm font-medium text-zinc-50 outline-none focus:ring-2 focus:ring-[#333] focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60'
      >
        {isLoading ? 'Please wait...' : 'Continue to Verify Email'}
      </button>
    </form>
  );
}
