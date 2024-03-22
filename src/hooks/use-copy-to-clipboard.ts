import { useCallback, useEffect, useState } from 'react';

type IsCopiedValue = boolean;
type CopyFn = (text: string) => Promise<boolean>;
type CopiedValue = string | null;

export function useCopyToClipboard(): [IsCopiedValue, CopyFn, CopiedValue] {
  const [copiedText, setCopiedText] = useState<CopiedValue>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const copy: CopyFn = useCallback(async (text) => {
    if (!navigator?.clipboard) {
      console.warn('Clipboard not supported');
      return false;
    }

    // Try to save to clipboard then save it in the state if worked
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      setIsCopied(true);
      return true;
    } catch (error) {
      console.warn('Copy failed', error);
      setCopiedText(null);
      return false;
    }
  }, []);

  useEffect(() => {
    if (!isCopied) {
      return;
    }

    const timeout = setTimeout(() => {
      setIsCopied(false);
      setCopiedText(null);
    }, 2000);

    return () => clearTimeout(timeout);
  }, [isCopied]);

  return [isCopied, copy, copiedText];
}
