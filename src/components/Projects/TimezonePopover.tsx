import { getTimezoneInfo } from '@/utils/timezone';
import type { TimezoneInfo } from '@/utils/timezone';
import { CaretSortIcon } from '@radix-ui/react-icons';
import { useMemo, useState } from 'react';
import { Button } from '../Interface/Button';
import { Popover, PopoverContent, PopoverTrigger } from '../Interface/Popover';
import { TimezonePopoverContent } from './TimezonePopoverContent';

type TimezonePopoverProps = {
  timezoneId?: string;
  onTimezoneChange?: (timezone: TimezoneInfo) => void;
};

export function TimezonePopover(props: TimezonePopoverProps) {
  const { timezoneId: defaultTimezoneId, onTimezoneChange } = props;

  const [open, setOpen] = useState(false);
  const timezoneInfo = useMemo(() => {
    return defaultTimezoneId ? getTimezoneInfo(defaultTimezoneId) : null;
  }, [defaultTimezoneId]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type='button'
          id='timezone-selector'
          className='justify-between px-3 text-base font-normal'
        >
          {timezoneInfo ? (
            <span>{timezoneInfo.standardName}</span>
          ) : (
            <span className='text-zinc-400'>Select timezone</span>
          )}
          <CaretSortIcon className='h-4 w-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent align='start' className='p-0'>
        <TimezonePopoverContent
          onClose={() => setOpen(false)}
          onSelect={(timezone) => {
            onTimezoneChange?.(timezone);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
