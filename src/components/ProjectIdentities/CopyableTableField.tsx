import { Check, Clipboard } from 'lucide-react';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { cn } from '@/utils/classname';

type CopyableTableProps = {
  value: string;
  className?: string;
  iconClassName?: string;
};

export function CopyableTableField(props: CopyableTableProps) {
  const { value, className, iconClassName } = props;

  const [isCopied, copy] = useCopyToClipboard();

  return (
    <button
      className={cn(
        'group/value relative inline-grid grid-cols-[1fr_18px] gap-1.5',
        className,
      )}
      onClick={() => copy(value)}
    >
      <span className='truncate'>{value}</span>

      <span
        className={cn(
          'flex h-full w-full items-center justify-center opacity-0 transition-opacity group-hover/value:opacity-100',
          iconClassName,
        )}
      >
        {isCopied ? (
          <Check size={14} className='text-green-600' />
        ) : (
          <Clipboard size={14} />
        )}
      </span>
    </button>
  );
}
