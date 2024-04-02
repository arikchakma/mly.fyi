import { Globe, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '../../utils/classname.js';
import {
  type TimezoneInfo,
  getTimezoneInfo,
  getTimezoneMatches,
} from '../../utils/timezone';

type TimezonePopoverContentProps = {
  onClose?: () => void;
  onSelect: (timezone: TimezoneInfo) => void;
  wrapperClass?: string;
  resultsClass?: string;
};

export function TimezonePopoverContent(props: TimezonePopoverContentProps) {
  const { onClose, onSelect, resultsClass = '', wrapperClass = '' } = props;

  const inputRef = useRef<HTMLInputElement>(null);
  const searchResultRef = useRef<HTMLDivElement>(null);

  const [timezoneMatches, setTimezoneMatches] = useState<string[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [searchText, setSearchText] = useState<string>('');

  useEffect(() => {
    if (!searchText) {
      setFocusedIndex(0);
      setTimezoneMatches([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      setTimezoneMatches(getTimezoneMatches(searchText).slice(0, 30));
      setFocusedIndex(0);
    }, 50);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [searchText]);

  useEffect(() => {
    const searchResultElement = searchResultRef.current;
    const focusedElement = searchResultElement?.children[
      focusedIndex
    ] as HTMLButtonElement;

    // bring in view the focused element
    if (focusedElement) {
      focusedElement.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }, [focusedIndex]);

  return (
    <div
      className={cn(
        'flex flex-shrink flex-col px-3 pt-1',
        timezoneMatches.length > 0 ? 'pb-3 ' : 'pb-1',
        wrapperClass,
      )}
    >
      <div className='relative'>
        <Globe
          className='absolute left-0 top-1/2 -translate-y-1/2 transform text-zinc-500'
          size={17}
        />
        <input
          value={searchText}
          ref={inputRef}
          autoFocus={true}
          type='text'
          className='w-full bg-transparent px-7 py-1.5 placeholder-zinc-500 focus:border-0 focus:shadow-none focus:outline-none'
          placeholder={'Search timezone, city, or country'}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setFocusedIndex((prev) => {
                const isLastIndex = focusedIndex === timezoneMatches.length - 1;
                return isLastIndex ? 0 : prev + 1;
              });
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setFocusedIndex((prev) => {
                const isFirstIndex = focusedIndex === 0;
                return isFirstIndex ? timezoneMatches.length - 1 : prev - 1;
              });
            } else if (e.key === 'Enter') {
              e.preventDefault();

              const timezoneId = timezoneMatches[focusedIndex];
              if (!timezoneId) {
                return;
              }

              const timezoneInfo = getTimezoneInfo(timezoneId);
              onSelect(timezoneInfo!);
            }
          }}
          onChange={(e) => {
            setSearchText(e.target.value);
          }}
        />

        <button
          className='absolute right-1 top-1/2 -translate-y-1/2 transform text-zinc-600 hover:text-zinc-400'
          onClick={() => {
            setSearchText('');
            onClose?.();
          }}
        >
          <X size={20} />
        </button>
      </div>

      <div
        className={cn(
          'relative max-h-[108px] overflow-y-scroll sm:max-h-[147px] no-scrollbar',
          resultsClass,
        )}
      >
        <div className='flex flex-col gap-0' ref={searchResultRef}>
          {timezoneMatches.map((timezoneId, counter) => {
            const timezoneInfo = getTimezoneInfo(timezoneId);

            return (
              <button
                key={timezoneId}
                className={cn(
                  'flex min-w-0 items-center truncate rounded-md px-1 py-1 text-sm text-zinc-400 focus:outline-none',
                  {
                    'bg-zinc-800': focusedIndex === counter,
                  },
                )}
                onMouseOver={() => {
                  setFocusedIndex(counter);
                }}
                onClick={() => {
                  onSelect(timezoneInfo!);
                }}
              >
                <span
                  className='mr-2 block rounded-md bg-black p-0.5 px-1.5 text-xs text-zinc-600 group-hover:text-zinc-400'
                  style={{
                    fontFeatureSettings: '"tnum", "lnum"',
                  }}
                >
                  GTM{timezoneInfo?.offset}
                </span>
                {timezoneInfo?.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
