import type { LucideIcon } from 'lucide-react';

type EmptyItemsProps = {
  title: string;
  description: string;
  linkText?: string;
  link?: string;
  icon: LucideIcon;
};

export function EmptyItems(props: EmptyItemsProps) {
  const { title, description, link, icon: Icon, linkText } = props;

  return (
    <div className='flex flex-col items-center text-center max-w-sm mx-auto'>
      <Icon className='w-12 h-12 text-zinc-500' />
      <h3 className='text-lg font-semibold mt-5'>{title}</h3>
      <p className='text-sm text-zinc-500 mt-1 text-balance'>{description}</p>

      {link && (
        <a
          className='rounded-md bg-zinc-800 px-2 py-1 text-sm text-zinc-50 shrink-0 mt-4'
          href={link}
        >
          <span className='mr-1.5'>+</span> <span>{linkText}</span>
        </a>
      )}
    </div>
  );
}
