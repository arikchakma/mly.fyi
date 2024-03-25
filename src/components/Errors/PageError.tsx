import { Ban } from 'lucide-react';

type PageErrorProps = {
  error: string;
};

export function PageError(props: PageErrorProps) {
  const { error = 'Something went wrong' } = props;

  return (
    <div className="mx-auto flex max-w-md flex-col items-center pt-0 sm:pt-12">
      <div className="mx-auto max-w-md text-center">
        <div className="mt-10 flex items-center gap-3 rounded-md border border-red-500 bg-red-700 px-3 py-1.5 font-medium text-white">
          <Ban className="mx-auto h-5 w-5 stroke-[3]" />
          <h3 className="text-base font-medium">{error}</h3>
        </div>
      </div>
    </div>
  );
}
