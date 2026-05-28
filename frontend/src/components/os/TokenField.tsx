import React from 'react';
import { RiFileCopyLine } from '@remixicon/react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface TokenFieldProps {
  label: string;
  value?: string | null;
  compact?: boolean;
}

export async function copyValue(label: string, value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} 已复制`);
  } catch (error) {
    toast.error(`${label} 复制失败`);
  }
}

export const TokenField: React.FC<TokenFieldProps> = ({ label, value, compact = false }) => {
  const hasValue = Boolean(value);

  return (
    <div className={cn('min-w-0 rounded-2xl border border-white/[0.07] bg-white/[0.035]', compact ? 'p-3' : 'p-4')}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-white/42">{label}</span>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-7 rounded-xl px-2 text-[11px]"
          disabled={!hasValue}
          onClick={() => value && copyValue(label, value)}
        >
          <RiFileCopyLine className="size-3.5" />
          复制
        </Button>
      </div>
      <div
        className={cn(
          'block min-w-0 max-w-full truncate rounded-xl border border-white/[0.05] bg-[#07090D]/45 px-3 py-2 font-mono text-xs tracking-normal text-white/70',
          compact ? 'h-9' : 'h-10'
        )}
        title={value || `${label} 暂无`}
      >
        {value || '暂无'}
      </div>
    </div>
  );
};
