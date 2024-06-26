import type { User } from '@/db/types';
import { cn } from '@/utils/classname';
import {
  BarChart2,
  Box,
  Fingerprint,
  FolderOpen,
  Key,
  Mail,
  Users2,
} from 'lucide-react';
import { AccountButton } from '../AccountButton';

type ProjectNavigationProps = {
  url: string;
  projectName: string;
  projectId: string;
  identityId?: string;
  emailId?: string;
  keyId?: string;
  currentUser: Pick<User, 'email' | 'name' | 'id'>;
};

export function ProjectNavigation(props: ProjectNavigationProps) {
  const {
    url: defaultUrl = '',
    projectName,
    projectId,
    identityId,
    emailId,
    keyId,
    currentUser,
  } = props;
  const url = new URL(defaultUrl || '');

  const primaryLinks = [
    {
      name: 'Dashboard',
      icon: BarChart2,
      href: `/projects/${projectId}/dashboard`,
      alts: [],
    },
    {
      name: 'Identity',
      icon: Fingerprint,
      href: `/projects/${projectId}/identities`,
      alts: [
        `/projects/${projectId}/identities/new`,
        `/projects/${projectId}/identities/${identityId}`,
      ],
    },
    {
      name: 'Key',
      icon: Key,
      href: `/projects/${projectId}/keys`,
      alts: [
        `/projects/${projectId}/keys/new`,
        `/projects/${projectId}/keys/${keyId}`,
      ],
    },
    {
      name: 'Email',
      icon: Mail,
      href: `/projects/${projectId}/emails`,
      alts: [`/projects/${projectId}/emails/${emailId}`],
    },
    {
      name: 'Member',
      icon: Users2,
      href: `/projects/${projectId}/members`,
      alts: [],
    },
    {
      name: 'Setting',
      icon: Box,
      href: `/projects/${projectId}/settings`,
      alts: [],
    },
  ] as const;

  return (
    <div className='w-full border-b border-zinc-800 px-4'>
      <div className='mx-auto flex max-w-3xl items-center justify-between gap-2'>
        <div className='flex items-center justify-start gap-5'>
          <a
            href='/projects'
            className='-mr-1.5 flex items-center gap-0.5 rounded-md border border-zinc-800 bg-zinc-900 py-1 pl-2 pr-2.5 text-sm text-zinc-50'
          >
            <FolderOpen size={16} />
            <span className='relative ml-1'>{projectName}</span>
          </a>
          {primaryLinks.map((item) => (
            <a
              key={item.name}
              className={cn(
                'flex items-center gap-1.5 py-2.5 text-sm text-zinc-500 hover:text-zinc-50',
                {
                  'text-zinc-50':
                    url.pathname === item.href ||
                    item?.alts?.includes(url?.pathname as never),
                },
              )}
              href={item.href}
            >
              <item.icon size={16} />
              {item.name}
            </a>
          ))}
        </div>
        <AccountButton user={currentUser} projectId={projectId} />
      </div>
    </div>
  );
}
