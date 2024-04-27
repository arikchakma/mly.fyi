import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { Check, Clipboard, Eye } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../Interface/Button';
import { Input } from '../Interface/Input';

type ProjectApiKeyCopyProps = {
  apiKey: string;
};

export function ProjectApiKeyCopy(props: ProjectApiKeyCopyProps) {
  const { apiKey } = props;

  const [show, setShow] = useState(false);
  const [isCopied, copy] = useCopyToClipboard();

  return (
    <div className='mt-1 flex items-stretch'>
      <Input
        className='rounded-r-none'
        value={apiKey}
        readOnly
        type={show ? 'text' : 'password'}
      />

      <Button
        size='icon'
        className='h-10 w-10 rounded-l-none rounded-r-none border-l-0 hover:opacity-100 hover:bg-opacity-80'
        onClick={() => {
          setShow((prev) => !prev);
        }}
      >
        <Eye size={14} />
      </Button>
      <Button
        size='icon'
        className='h-10 w-10 rounded-l-none border-l-0 hover:opacity-100 hover:bg-opacity-80'
        onClick={() => {
          copy(apiKey);
        }}
      >
        {isCopied ? (
          <Check size={14} className='text-green-600' />
        ) : (
          <Clipboard size={14} />
        )}
      </Button>
    </div>
  );
}
