import type { GetProjectResponse } from '@/pages/api/v1/projects/[projectId]';

type ProjectSettingsPageProps = {
  project: GetProjectResponse;
  projectId: string;
};

export function ProjectSettingsPage(props: ProjectSettingsPageProps) {
  return (
    <div className="mx-auto max-w-3xl py-12">
      <h2 className="mb-6 text-xl font-bold">Settings</h2>
    </div>
  );
}
