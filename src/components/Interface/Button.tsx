import { Slot } from '@radix-ui/react-slot';
import { type VariantProps, cva } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '../../utils/classname';

const buttonVariants = cva(
  'inline-flex w-full items-center justify-center gap-2 rounded-lg border p-2 text-sm font-medium outline-none disabled:cursor-not-allowed disabled:opacity-60',
  {
    variants: {
      variant: {
        default:
          'border-zinc-700 bg-zinc-800 text-zinc-50 hover:opacity-80 focus:border-zinc-500',
        outline:
          'border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50 focus:border-zinc-500',
        destructive:
          'border-red-700 bg-red-800 text-red-50 hover:opacity-80 focus:border-red-500',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
