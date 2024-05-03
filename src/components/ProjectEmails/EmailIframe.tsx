import { MailOpen } from 'lucide-react';
import React from 'react';
import { type RefObject, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { cn } from '../../utils/classname';
import { isSafari } from '../../utils/delete-browser';
import { Button } from '../Interface/Button';

type EmailIFrameProps = {
  innerHTML: string;
  isServer?: boolean;
  showOpenInNewTab?: boolean;
  wrapperClassName?: string;
} & React.HTMLProps<HTMLIFrameElement>;

export function EmailIFrame(props: EmailIFrameProps) {
  const {
    innerHTML,
    isServer,
    showOpenInNewTab = true,
    wrapperClassName,
    ...defaultProps
  } = props;

  const iframeRef = useRef<HTMLIFrameElement>(null);

  function handleOpen() {
    if (innerHTML.trim().length === 0) {
      toast.error('There is no data to preview.');
      return;
    }

    const newWindow = window.open('about:blank', '_blank');
    newWindow?.focus();

    const newDoc = newWindow?.document;
    if (!newDoc) {
      toast.error('Something went wrong.');
      return;
    }

    newDoc.open();
    newDoc.write(innerHTML);
    newDoc.close();
  }

  return (
    <div className={cn('relative', wrapperClassName)}>
      <iframe
        title='Email preview'
        {...defaultProps}
        ref={iframeRef}
        srcDoc={innerHTML}
        sandbox=''
      />

      {showOpenInNewTab ? (
        <Button
          className='absolute bottom-0 right-0 h-8 gap-1.5 rounded-none rounded-tl-md border-l border-t text-sm font-normal inline-flex items-center justify-center px-2 w-auto border-none'
          onClick={handleOpen}
          type='button'
        >
          <MailOpen className='h-3.5 w-3.5 shrink-0' />
          <span>Open in new tab</span>
        </Button>
      ) : null}
    </div>
  );
}
