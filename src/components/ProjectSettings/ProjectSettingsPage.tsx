import type { GetProjectResponse } from '@/pages/api/v1/projects/[projectId]';
import { ProjectConfigurationForm } from './ProjectConfigurationForm';

type ProjectSettingsPageProps = {
  project: GetProjectResponse;
  projectId: string;
};

export function ProjectSettingsPage(props: ProjectSettingsPageProps) {
  const { project, projectId } = props;

  return (
    <div className="mx-auto max-w-sm py-12">
      <ProjectConfigurationForm project={project} projectId={projectId} />
    </div>
  );
}
