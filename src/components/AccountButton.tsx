import type { User } from '@/db/types';
import { logout } from '@/lib/jwt-client';
import {
  BarChart2,
  Fingerprint,
  Folder,
  Key,
  LogOut,
  Mail,
  Plus,
  User2,
} from 'lucide-react';
import { Button } from './Interface/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './Interface/DropdownMenu';

type AccountButtonProps = {
  projectId?: string;
  user: Pick<User, 'email'>;
};

export function AccountButton(props: AccountButtonProps) {
  const { user, projectId } = props;

  const primaryLinks = [
    {
      name: 'Dashboard',
      icon: BarChart2,
      href: `/projects/${projectId}/dashboard`,
    },
    {
      name: 'Identity',
      icon: Fingerprint,
      href: `/projects/${projectId}/identities`,
    },
    {
      name: 'Key',
      icon: Key,
      href: `/projects/${projectId}/keys`,
    },
    {
      name: 'Email',
      icon: Mail,
      href: `/projects/${projectId}/emails`,
    },
  ];

  const secondaryLinks = [
    {
      name: 'Projects',
      icon: Folder,
      href: `/projects`,
    },
    {
      name: 'New Project',
      icon: Plus,
      href: `/projects/new`,
    },
  ];

  return (
    <>
      <div className={'flex gap-3'}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size='icon' className='ml-auto h-[30px] w-[30px]'>
              <User2 className='inline-block' size={15} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' side={'bottom'}>
            <DropdownMenuLabel className='flex flex-col text-xs font-normal'>
              <span className='font-medium text-zinc-500'>Signed in as</span>
              <span className='truncate text-zinc-300'>{user?.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {projectId
              ? primaryLinks.map((link) => (
                  <DropdownMenuItem key={link.href} asChild>
                    <a
                      href={link.href}
                      className='flex w-full items-center justify-between'
                    >
                      {link.name}
                      <link.icon className='text-gray-500' size={15} />
                    </a>
                  </DropdownMenuItem>
                ))
              : null}

            {projectId ? <DropdownMenuSeparator /> : null}

            {secondaryLinks.map((link) => (
              <DropdownMenuItem key={link.href} asChild>
                <a
                  href={link.href}
                  className='flex w-full items-center justify-between'
                >
                  {link.name}
                  <link.icon className='text-gray-500' size={15} />
                </a>
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              <span className='flex w-full items-center justify-between'>
                Logout
                <LogOut className='text-gray-500' size={15} />
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
