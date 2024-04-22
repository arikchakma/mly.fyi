import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '@/utils/classname';

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    data-content-required='*'
    className={cn(
      'block text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 aria-required:after:ml-0.5 aria-required:after:mr-0.5 aria-required:after:text-red-600 aria-required:after:content-[attr(data-content-required)]',
      className,
    )}
    {...props}
  />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
