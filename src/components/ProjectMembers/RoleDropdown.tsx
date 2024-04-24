import { ChevronDown } from 'lucide-react';
import { Button } from '../Interface/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../Interface/DropdownMenu';

const allowedRoles = [
  {
    name: 'Admin',
    value: 'admin',
    description: 'Can do everything',
  },
  {
    name: 'Manager',
    value: 'manager',
    description: 'Can only manage members',
  },
  {
    name: 'Viewer',
    value: 'viewer',
    description: 'Can only view the project',
  },
] as const;

export type AllowedProjectMemberRole = (typeof allowedRoles)[number]['value'];

type RoleDropdownProps = {
  selectedRole: string;
  setSelectedRole: (role: AllowedProjectMemberRole) => void;
};

export function RoleDropdown(props: RoleDropdownProps) {
  const { selectedRole, setSelectedRole } = props;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='outline'
          className='border-dashed capitalize justify-between px-3 font-normal'
        >
          {selectedRole || 'Select Role'}
          <ChevronDown className='ml-2' size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {allowedRoles.map((allowedRole) => (
          <DropdownMenuItem
            key={allowedRole.value}
            onClick={() => {
              setSelectedRole(allowedRole.value);
            }}
            className='flex flex-col items-start gap-0.5'
          >
            <span className='block font-medium'>{allowedRole.name}</span>
            <span className='block text-xs text-zinc-400'>
              {allowedRole.description}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
