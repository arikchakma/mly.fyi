import { MoreHorizontal } from 'lucide-react';
import { usePagination } from '../hooks/use-pagination';
import { cn } from '../utils/classname';
import { formatCommaNumber } from '../utils/number';

type PaginationProps = {
  variant?: 'minimal' | 'default';
  totalPages: number;
  currPage: number;
  perPage: number;
  totalCount: number;
  isDisabled?: boolean;
  onPageChange: (page: number) => void;
};

export function Pagination(props: PaginationProps) {
  const {
    variant = 'default',
    onPageChange,
    totalCount,
    totalPages,
    currPage,
    perPage,
    isDisabled = false,
  } = props;

  if (!totalPages || totalPages === 1) {
    return null;
  }

  const pages = usePagination(currPage, totalPages, 5);

  return (
    <div
      className={cn('flex items-center', {
        'justify-between': variant === 'default',
        'justify-start': variant === 'minimal',
      })}
    >
      <div className="flex items-center gap-1 text-xs font-medium">
        <button
          onClick={() => {
            onPageChange(currPage - 1);
          }}
          disabled={currPage === 1 || isDisabled}
          className="rounded-md border border-zinc-800 px-2 py-1 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          &larr;
        </button>
        {variant === 'default' && (
          <>
            {pages.map((page, counter) => {
              if (page === 'more') {
                return (
                  <span
                    key={`page-${page}-${counter}`}
                    className="hidden sm:block"
                  >
                    <MoreHorizontal className="text-zinc-400" size={14} />
                  </span>
                );
              }

              return (
                <button
                  key={`page-${page}`}
                  disabled={isDisabled}
                  onClick={() => {
                    onPageChange(page as number);
                  }}
                  className={cn(
                    'hidden rounded-md border border-zinc-800 px-2 py-1 hover:bg-zinc-800 sm:block',
                    {
                      'opacity-50': currPage === page,
                    },
                  )}
                >
                  {page}
                </button>
              );
            })}
          </>
        )}
        <button
          disabled={currPage === totalPages || isDisabled}
          className="rounded-md border border-zinc-800 px-2 py-1 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => {
            onPageChange(currPage + 1);
          }}
        >
          &rarr;
        </button>
      </div>
      <span className="ml-2 hidden text-sm font-normal text-zinc-500 sm:block">
        Showing {formatCommaNumber((currPage - 1) * perPage)} to{' '}
        {formatCommaNumber((currPage - 1) * perPage + perPage)} of{' '}
        {formatCommaNumber(totalCount)} entries
      </span>
    </div>
  );
}
