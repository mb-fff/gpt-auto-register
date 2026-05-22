import * as React from 'react';
import { cn } from '../../lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    'border-white/10 bg-[linear-gradient(135deg,rgba(110,123,255,0.92),rgba(157,124,255,0.86))] text-white shadow-[0_0_34px_rgba(110,123,255,0.28)] hover:shadow-[0_0_44px_rgba(110,123,255,0.38)]',
  secondary:
    'border-white/10 bg-white/[0.07] text-[#F5F7FF] hover:bg-white/[0.11] hover:border-white/20',
  ghost:
    'border-transparent bg-transparent text-white/68 hover:bg-white/[0.07] hover:text-white',
  danger:
    'border-red-300/20 bg-red-500/15 text-red-100 hover:bg-red-500/22',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-sm',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'secondary', size = 'md', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-2xl border font-medium tracking-normal outline-none transition-all duration-200 hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50',
        sizes[size],
        variants[variant],
        className
      )}
      {...props}
    />
  )
);

Button.displayName = 'Button';
