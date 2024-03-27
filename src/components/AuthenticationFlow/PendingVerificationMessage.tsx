import { useState } from 'react';
import { httpPost } from '../../lib/http';
import { useMutation } from '@tanstack/react-query';
import { queryClient } from '@/utils/query-client';
import type { SendVerificationEmailBody } from '@/pages/api/v1/auth/send-verification-email';
import { toast } from 'sonner';

type PendingVerificationMessageProps = {
  email: string;
};

export function PendingVerificationMessage(
  props: PendingVerificationMessageProps,
) {
  const { email } = props;
  const [isEmailResent, setIsEmailResent] = useState(false);

  const sendVerificationEmail = useMutation(
    {
      mutationKey: ['send-verification-email'],
      mutationFn: (body: SendVerificationEmailBody) => {
        return httpPost('/api/v1/auth/send-verification-email', body);
      },
      onSuccess: () => {
        setIsEmailResent(true);
      },
    },
    queryClient,
  );

  const resendVerificationEmail = () => {
    toast.promise(sendVerificationEmail.mutateAsync({ email }), {
      loading: 'Sending the email ..',
      success: 'Verification email has been sent!',
      error: (error) => {
        return error?.message || 'Something went wrong.';
      },
    });
  };

  const isLoading = sendVerificationEmail.status === 'pending';

  return (
    <div className="mx-auto max-w-md text-center">
      <h2 className="my-2 text-center text-xl font-semibold sm:my-5 sm:text-2xl">
        Verify your email address
      </h2>
      <div className="text-sm text-zinc-400 sm:text-base">
        <p>
          We have sent you an email at{' '}
          <span className="font-bold text-zinc-200">{email}</span>. Please click
          the link to verify your account. This link will expire shortly, so
          please verify soon!
        </p>

        <hr className="my-4 border-zinc-600" />

        {!isEmailResent && (
          <>
            {isLoading && <p className="text-zinc-400">Sending the email ..</p>}
            {!isLoading && (
              <p>
                Please make sure to check your spam folder. If you still don't
                have the email click to{' '}
                <button
                  disabled={!email}
                  className="inline text-blue-600"
                  onClick={resendVerificationEmail}
                >
                  resend verification email.
                </button>
              </p>
            )}
          </>
        )}

        {isEmailResent && (
          <p className="text-green-700">Verification email has been sent!</p>
        )}
      </div>
    </div>
  );
}
