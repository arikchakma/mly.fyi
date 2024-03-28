import { cn } from '@/utils/classname';
import { useMutation } from '@tanstack/react-query';
import { Loader2, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import { httpPost } from '../../lib/http';
import { queryClient } from '../../utils/query-client';

type TriggerVerifyIdentityProps = {
  projectId: string;
  identityId: string;
  label?: string;
  className?: string;
  iconSize?: number;
};

export function TriggerVerifyIdentity(props: TriggerVerifyIdentityProps) {
  const { projectId, identityId, label, className, iconSize = 16 } = props;

  const triggerVerifyDomain = useMutation(
    {
      mutationKey: ['project-identities', projectId, identityId, 'verify'],
      mutationFn: () => {
        return httpPost(
          `/api/v1/projects/${projectId}/identities/${identityId}/verify`,
          {},
        );
      },
      onSuccess: () => {
        queryClient.invalidateQueries();
      },
    },
    queryClient,
  );

  const { isPending } = triggerVerifyDomain;

  return (
    <button
      disabled={isPending}
      className={cn(
        'inline-flex items-center text-sm text-zinc-400 hover:text-zinc-50 disabled:opacity-70',
        className,
      )}
      onClick={() => {
        toast.promise(triggerVerifyDomain.mutateAsync(), {
          loading: 'Refreshing Identity status..',
          success: 'Refreshed Identity status',
          error: (err) => {
            return err?.message || 'Something went wrong';
          },
        });
      }}
    >
      {isPending ? (
        <Loader2 size={iconSize} className='animate-spin' />
      ) : (
        <RefreshCcw size={iconSize} />
      )}
      {label && <span>{label}</span>}
    </button>
  );
}
