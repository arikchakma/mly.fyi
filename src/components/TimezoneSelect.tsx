import { Check, ChevronsUpDown } from 'lucide-react';
import * as React from 'react';
import timezones from 'timezones-list';

import { useState } from 'react';
import { cn } from '../utils/classname.ts';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './Interface/Popover.tsx';

type TimezoneSelectProps = {
  value: string;
  setValue: (value: string) => void;
};

export function TimezoneSelect(props: TimezoneSelectProps) {
  const { value = '', setValue } = props;
  const [open, setOpen] = React.useState(false);

  const [searchText, setSearchText] = useState('');
  const placeholderText = 'Select Timezone...';

  const timezonesList =
    timezones?.map((timezone) => ({
      name: timezone.name,
      label: timezone.label,
      value: timezone.tzCode,
    })) || [];

  const matches = searchText
    ? timezonesList
        .filter((timezone) => {
          return timezone.label
            .toLowerCase()
            .includes(searchText.toLowerCase());
        })
        .slice(0, 10)
    : timezonesList.slice(0, 10);

  const selectedOptionLabel = value
    ? timezonesList.find((tz) => tz.value === value)?.label || placeholderText
    : placeholderText;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          role='combobox'
          aria-expanded={open}
          className={cn(
            'mt-2 flex w-full items-center justify-between gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 outline-none placeholder:text-zinc-400 focus:border-zinc-600',
            {
              'text-gray-400': !value,
            },
          )}
        >
          {selectedOptionLabel}
          <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align='start'
        className='w-[var(--radix-popover-trigger-width)] overflow-hidden border-zinc-700 bg-zinc-800 p-0'
      >
        <input
          type='text'
          autoFocus
          placeholder='Search timezones'
          className='block w-full border-0 border-b border-zinc-700 bg-zinc-800 px-3 py-3 text-base outline-none placeholder:text-sm placeholder:text-zinc-400 focus:shadow-none'
          onInput={(e) => setSearchText(String((e.target as any).value))}
        />

        {matches.length === 0 && (
          <div className='p-2 text-sm text-zinc-400'>No results found</div>
        )}

        {matches.length > 0 && (
          <ul className=' divide-y divide-zinc-700'>
            {matches.map((timezone) => (
              <li key={timezone.value}>
                <button
                  type='button'
                  className={cn(
                    'flex w-full cursor-pointer items-center justify-between gap-2 p-2 text-sm hover:bg-zinc-700',
                    {
                      'bg-zinc-700': timezone.value === value,
                    },
                  )}
                  onClick={() => {
                    setValue(timezone.value);
                    setOpen(false);
                  }}
                >
                  <span className='truncate'>{timezone.label}</span>
                  {timezone.value === value && <Check className='h-4 w-4' />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
