import React from 'react';
import type { GetProjectMembersResponse } from '@/pages/api/v1/projects/[projectId]/members/index.ts';
import { MemberActionDropdown } from './MemberActionDropdown.tsx';
import { MemberRoleBadge } from './MemberRoleBadge.tsx';

type ProjectMemberProps = {
  member: GetProjectMembersResponse[number];
  userId: string;
  index: number;
  projectId: string;
  canManageCurrentProject: boolean;
};

export function ProjectMemberItem(props: ProjectMemberProps) {
  const {
    member,
    index,
    canManageCurrentProject,
    userId: currentUserId,
  } = props;

  return (
    <div
      className={`flex items-center justify-between gap-2 p-3 ${
        index === 0 ? '' : 'border-t border-zinc-800'
      }`}
    >
      <div className='flex items-center gap-3'>
        <div>
          <div className='mb-1 flex items-center gap-2 sm:hidden'>
            <MemberRoleBadge role={member.role} />
          </div>
          <div className='flex items-center'>
            <h3 className='inline-grid grid-cols-[auto_auto_auto] items-center font-medium'>
              <span className='truncate'>{member.name}</span>
              {member.userId === currentUserId && (
                <span className='ml-2 hidden text-xs font-normal text-orange-500 sm:inline'>
                  You
                </span>
              )}
            </h3>
            <div className='ml-2 flex items-center gap-0.5'>
              {member.status === 'invited' && (
                <span className='rounded-full bg-yellow-700 px-2 py-0.5 text-xs text-yellow-100'>
                  Invited
                </span>
              )}
              {member.status === 'rejected' && (
                <span className='rounded-full bg-red-700 px-2 py-0.5 text-xs text-red-100'>
                  Rejected
                </span>
              )}
            </div>
          </div>
          <p className='truncate text-sm text-zinc-500'>
            {member.invitedEmail}
          </p>
        </div>
      </div>

      <div className='flex shrink-0 items-center text-sm'>
        <span className={'hidden sm:block'}>
          <MemberRoleBadge role={member.role} />
        </span>
        {canManageCurrentProject && (
          <MemberActionDropdown
            allowUpdateRole={member.status !== 'rejected'}
            isDisabled={member.userId === currentUserId}
            member={member}
          />
        )}
      </div>
    </div>
  );
}
