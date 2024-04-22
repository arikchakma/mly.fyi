import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { httpGet } from '@/lib/http';
import type { GetProjectMembersResponse } from '@/pages/api/v1/projects/[projectId]/members/index';
import { queryClient } from '@/utils/query-client';
import { PageError } from '../Errors/PageError';
import { LoadingMessage } from '../LoadingMessage';
import { InviteMemberButton } from './InviteMemberButton';
import { LeaveProjectButton } from './LeaveProjectButton';
import { ProjectMemberItem } from './ProjectMemberItem';

type ListProjectMembersProps = {
  projectId: string;
  currentUserId: string;
  canManageCurrentProject: boolean;
};

export function ListProjectMembers(props: ListProjectMembersProps) {
  const { projectId, currentUserId, canManageCurrentProject = false } = props;

  const { data: members, error } = useQuery<GetProjectMembersResponse>(
    {
      queryKey: ['project-members', projectId],
      queryFn: () => {
        return httpGet(`/api/v1/projects/${projectId}/members`, {});
      },
    },
    queryClient,
  );

  if (error && !members) {
    return (
      <PageError
        error={error?.message || 'Something went wrong!'}
        className='sm:pt-0'
      />
    );
  }

  if (!members) {
    return <LoadingMessage message='Loading Project Members...' />;
  }
  const MAX_MEMBER_COUNT = 100;

  const joinedMembers =
    members?.filter((member) => member.status === 'joined') || [];
  const invitedMembers = members?.filter(
    (member) => member.status === 'invited',
  );
  const rejectedMembers = members?.filter(
    (member) => member.status === 'rejected',
  );

  return (
    <div>
      <h2 className='mb-6 text-xl font-bold'>Members</h2>

      <div className='rounded-md border border-zinc-800 overflow-hidden'>
        <div className='flex items-center justify-between gap-2 border-b p-3 border-zinc-800 bg-zinc-900'>
          <p className='hidden text-sm sm:block'>
            {members?.length} member in the project
          </p>
          <p className='block text-sm sm:hidden'>{members?.length} member(s)</p>
          <LeaveProjectButton projectId={projectId} />
        </div>

        {joinedMembers.map((member, index) => {
          return (
            <ProjectMemberItem
              key={member.id}
              member={member}
              index={index}
              projectId={projectId!}
              userId={currentUserId!}
              canManageCurrentProject={canManageCurrentProject}
            />
          );
        })}
      </div>

      {invitedMembers?.length! > 0 && (
        <div className='mt-6'>
          <h3 className='text-xs uppercase text-zinc-400'>Invited Members</h3>
          <div className='mt-2 rounded-md border border-zinc-800'>
            {invitedMembers?.map((member, index) => {
              return (
                <ProjectMemberItem
                  key={member.id}
                  member={member}
                  index={index}
                  projectId={projectId!}
                  userId={currentUserId!}
                  canManageCurrentProject={canManageCurrentProject}
                />
              );
            })}
          </div>
        </div>
      )}

      {rejectedMembers?.length! > 0 && (
        <div className='mt-6'>
          <h3 className='text-xs uppercase text-zinc-400'>Rejected Invites</h3>
          <div className='mt-2 rounded-md border border-zinc-800'>
            {rejectedMembers?.map((member, index) => {
              return (
                <ProjectMemberItem
                  key={member.id}
                  member={member}
                  index={index}
                  projectId={projectId!}
                  userId={currentUserId!}
                  canManageCurrentProject={canManageCurrentProject}
                />
              );
            })}
          </div>
        </div>
      )}

      {canManageCurrentProject && members?.length! < MAX_MEMBER_COUNT && (
        <div className='mt-4'>
          <InviteMemberButton projectId={projectId!} />
        </div>
      )}

      {members?.length! >= MAX_MEMBER_COUNT && canManageCurrentProject && (
        <p className='mt-2 rounded-lg text-red-100 bg-red-950 p-2 border border-red-700'>
          You have reached the maximum number of members in a project. If you
          need more members, please contact support.
        </p>
      )}
    </div>
  );
}
