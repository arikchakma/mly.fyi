import type { GetProjectResponse } from '@/pages/api/v1/projects/[projectId]';
import { ProjectForm } from '../Projects/ProjectForm';
import { DeleteProject } from './DeleteProject';
import { ProjectConfigurationForm } from './ProjectConfigurationForm';

type ProjectSettingsPageProps = {
  project: GetProjectResponse;
  projectId: string;
};

export function ProjectSettingsPage(props: ProjectSettingsPageProps) {
  const { project, projectId } = props;

  return (
    <div className='mx-auto max-w-sm py-12'>
      <ProjectForm project={project} action='update' />
      <hr className='my-8 border-zinc-800' />
      <ProjectConfigurationForm project={project} projectId={projectId} />
      <hr className='my-8 border-zinc-800' />
      <DeleteProject projectId={projectId} projectName={project?.name} />
    </div>
  );
}
