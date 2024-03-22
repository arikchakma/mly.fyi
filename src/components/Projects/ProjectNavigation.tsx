import {
  BarChart2,
  Box,
  FolderOpen,
  Wand2,
  Mail,
  Package2,
  LayoutTemplate,
  Fingerprint,
} from 'lucide-react';
import { cn } from '../../utils/classname';

type ProjectNavigationProps = {
  url: URL;
  project: {
    id: string;
    name: string;
  };
  params: {
    projectId?: string;
    identityId?: string;
  };
};

export function ProjectNavigation(props: ProjectNavigationProps) {
  const { url, project, params } = props;
  const { projectId, identityId } = params;

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
      name: 'Email',
      icon: Mail,
      href: `/projects/${projectId}/emails`,
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
    <div className="w-full border-b border-zinc-800">
      <div className="mx-auto flex max-w-3xl items-center justify-start gap-5">
        <a
          href="/projects"
          className="-mr-1.5 flex items-center gap-0.5 rounded-md border border-zinc-800 bg-zinc-900 py-1 pl-2 pr-2.5 text-sm text-zinc-50"
        >
          <FolderOpen size={16} />
          <span className="relative ml-1">{project.name}</span>
        </a>
        {primaryLinks.map((item) => (
          <a
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
    </div>
  );
}
