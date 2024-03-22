import React from 'react';
import { Check, Clipboard } from 'lucide-react';
import { useCopyToClipboard } from '../../hooks/use-copy-to-clipboard';

type CopyableTableProps = {
  value: string;
};

export function CopyableTableField(props: CopyableTableProps) {
  const { value } = props;

  const [isCopied, copy] = useCopyToClipboard();

  return (
    <button
      className="group/value relative inline-grid"
      onClick={() => copy(value)}
    >
      <span className="truncate pr-5">{value}</span>

      <span className="absolute right-0 top-0 flex h-full items-center opacity-0 transition-opacity group-hover/value:opacity-100">
        {isCopied ? (
          <Check size={14} className="text-green-600" />
        ) : (
          <Clipboard size={14} />
        )}
      </span>
    </button>
  );
}
