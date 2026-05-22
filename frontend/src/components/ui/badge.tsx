import * as React from 'react';
import { cn } from '../../lib/utils';

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'violet';

const tones: Record<BadgeTone, string> = {
  neutral: 'border-white/10 bg-white/[0.07] text-white/70',
  success: 'border-emerald-300/20 bg-emerald-400/10 text-emerald-200',
  warning: 'border-amber-300/20 bg-amber-400/10 text-amber-200',
  danger: 'border-red-300/20 bg-red-400/10 text-red-200',
  violet: 'border-[#9D7CFF]/25 bg-[#9D7CFF]/12 text-[#d8ccff]',
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ className, tone = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
