import * as React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'h-12 w-full rounded-2xl border border-white/10 bg-white/[0.055] px-4 text-sm text-[#F5F7FF] outline-none transition-all placeholder:text-white/32 focus:border-[#6E7BFF]/55 focus:bg-white/[0.08] focus:shadow-[0_0_0_4px_rgba(110,123,255,0.12)]',
      className
    )}
    {...props}
  />
));

Input.displayName = 'Input';
