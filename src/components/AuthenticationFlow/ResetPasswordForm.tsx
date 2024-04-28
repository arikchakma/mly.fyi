import { httpPost } from '@/lib/http';
import { redirectAuthSuccess, setAuthToken } from '@/lib/jwt-client';
import { queryClient } from '@/utils/query-client';
import { useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import React from 'react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../Interface/Button';
import { Input } from '../Interface/Input';
import { Label } from '../Interface/Label';

type ResetPasswordFormProps = {
  resetCode: string;
};

export function ResetPasswordForm(props: ResetPasswordFormProps) {
  const { resetCode } = props;

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const resetPassword = useMutation(
    {
      mutationKey: ['reset-password', resetCode],
      mutationFn: () => {
        return httpPost<{ token: string }>(
          `/api/v1/auth/reset-password/${resetCode}`,
          {
            newPassword,
            confirmPassword,
          },
        );
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
    },
    queryClient,
  );

  const handleFormSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    toast.promise(resetPassword.mutateAsync(), {
      loading: 'Please wait...',
      success: 'Password reset successfully.',
      error: (error) => {
        return error?.message || 'Something went wrong.';
      },
    });
  };

  const isLoading = resetPassword.status === 'pending';

  return (
    <form className='w-full' onSubmit={handleFormSubmit}>
      <Label htmlFor='new-password' className='sr-only'>
        New Password
      </Label>
      <Input
        name='new-password'
        type='password'
        autoComplete='new-password'
        required
        placeholder='New Password'
        min={8}
        max={25}
        value={newPassword}
        onInput={(e) => setNewPassword(String((e.target as any).value))}
      />

      <Label htmlFor='confirm-password' className='sr-only'>
        Confirm Password
      </Label>
      <Input
        className='mt-2'
        name='confirm-password'
        type='password'
        autoComplete='confirm-password'
        required
        placeholder='Confirm Password'
        min={8}
        max={25}
        value={confirmPassword}
        onInput={(e) => setConfirmPassword(String((e.target as any).value))}
      />

      <Button type='submit' disabled={isLoading} className='mt-3'>
        {isLoading ? (
          <Loader2 className='animate-spin w-4 h-4 stroke-[2.5px]' />
        ) : (
          'Reset Password'
        )}
      </Button>
    </form>
  );
}
