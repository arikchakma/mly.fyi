import { DeleteProjectDialog } from './DeleteProjectDialog';

type DeleteProjectProps = {
  projectId: string;
  projectName: string;
};

export function DeleteProject(props: DeleteProjectProps) {
  const { projectId, projectName } = props;

  return (
    <div>
      <h2 className='mb-1 text-xl font-medium'>Delete Project</h2>
      <p className='mb-4 text-sm text-zinc-500 text-balance'>
        Permanently delete this project. This action cannot be undone and all
        data associated with this project will be lost.
      </p>

      <DeleteProjectDialog projectId={projectId} projectName={projectName} />
    </div>
  );
}
