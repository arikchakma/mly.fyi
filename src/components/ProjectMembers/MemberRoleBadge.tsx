import { cn } from '@/utils/classname.ts';
import type { AllowedProjectMemberRole } from './RoleDropdown.tsx';

export function MemberRoleBadge({ role }: { role: AllowedProjectMemberRole }) {
  return (
    <span
      className={cn(
        'flex items-center rounded-full px-2 py-0.5 text-xs capitalize sm:flex',
        {
          'bg-orange-700 text-orange-100': ['admin'].includes(role),
          'bg-zinc-900 text-zinc-100': !['admin'].includes(role),
          'bg-green-700 text-green-100': ['manager'].includes(role),
        },
      )}
    >
      {role}
    </span>
  );
}
