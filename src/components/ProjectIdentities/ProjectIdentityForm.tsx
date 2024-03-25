import React, { useId, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryClient } from '../../utils/query-client';
import { httpPost } from '../../lib/http';
import type {
  CreateProjectIdentityBody,
  CreateProjectIdentityResponse,
} from '../../pages/api/v1/projects/[projectId]/identities/create';
import { isValidDomain } from '@/lib/domain';

type ProjectIdentityFormProps = {
  projectId: string;
};

export function ProjectIdentityForm(props: ProjectIdentityFormProps) {
  const { projectId } = props;

  const domainFieldId = `pjt:${useId()}`;
  const mailFromDomainFieldId = `pjt:${useId()}`;

  const [domain, setDomain] = useState('');
  const [mailFromDomain, setMailFromDomain] = useState('');

  const createIdentity = useMutation(
    {
      mutationKey: ['project-identity', domain],
      mutationFn: (data: CreateProjectIdentityBody) => {
        return httpPost<CreateProjectIdentityResponse>(
          `/api/v1/projects/${projectId}/identities/create`,
          data,
        );
      },
      onSuccess: (data) => {
        window.location.href = `/projects/${projectId}/identities/${data.identityId}`;
      },
    },
    queryClient,
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const sanitizedDomain = domain.trim().replace(/^https?:\/\//, ''); // Remove http(s)://
    const sanitizedMailFromDomain = mailFromDomain
      .trim()
      .replace(/^https?:\/\//, ''); // Remove http(s)://

    if (!sanitizedDomain || !isValidDomain(sanitizedDomain)) {
      toast.error('Please provide a valid domain');
      return;
    }

    if (
      sanitizedMailFromDomain &&
      (!sanitizedMailFromDomain.includes(sanitizedDomain) ||
        !isValidDomain(sanitizedMailFromDomain) ||
        sanitizedMailFromDomain === sanitizedDomain)
    ) {
      toast.error('Mail From Domain must be a subdomain of Domain');
      return;
    }

    toast.promise(
      createIdentity.mutateAsync({
        type: 'domain',
        domain: sanitizedDomain,
        mailFromDomain: sanitizedMailFromDomain,
      }),
      {
        loading: 'Creating project identity...',
        success: 'Project identity created successfully',
        error: (e) => {
          return (
            e?.message || 'An error occurred while creating project identity'
          );
        },
      },
    );
  };

  const isLoading = createIdentity.isPending;

  return (
    <form className="mx-auto w-full max-w-sm" onSubmit={handleSubmit}>
      <h2 className="mb-1 text-xl font-medium">Add Indentity</h2>
      <p className="mb-4 text-sm text-zinc-500">
        Fill the details below to get started
      </p>
      <div>
        <label
          htmlFor={domainFieldId}
          aria-required={true}
          data-content-required="*"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 aria-required:after:ml-0.5 aria-required:after:mr-0.5 aria-required:after:text-red-600 aria-required:after:content-[attr(data-content-required)]"
        >
          Domain
        </label>
        <input
          name={domainFieldId}
          id={domainFieldId}
          spellCheck={false}
          autoComplete="off"
          type="text"
          required
          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 outline-none placeholder:text-zinc-400 focus:border-zinc-600"
          placeholder="mly.fyi"
          min={3}
          value={domain}
          onInput={(e) => setDomain(String((e.target as any).value))}
        />

        <p className="mt-2 text-sm text-zinc-500">
          Use Apex domain (e.g. mly.fyi)
        </p>
      </div>

      <div>
        <label
          htmlFor={mailFromDomainFieldId}
          className="mt-4 block text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Mail From Domain{' '}
          <span className="text-xs text-zinc-400">(Recomended)</span>
        </label>
        <input
          name={mailFromDomainFieldId}
          id={mailFromDomainFieldId}
          spellCheck={false}
          autoComplete="off"
          type="text"
          className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 outline-none placeholder:text-zinc-400 focus:border-zinc-600"
          placeholder="send.mly.fyi"
          value={mailFromDomain}
          onInput={(e) => setMailFromDomain(String((e.target as any).value))}
        />

        <p className="mt-2 text-sm text-zinc-500">
          Use subdomain of domain (e.g. send.mly.fyi)
        </p>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 p-2 text-sm font-medium text-zinc-50 outline-none focus:border-none focus:ring-2 focus:ring-zinc-500 active:outline-none disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? 'Please wait...' : 'Add Identity'}
      </button>
    </form>
  );
}
