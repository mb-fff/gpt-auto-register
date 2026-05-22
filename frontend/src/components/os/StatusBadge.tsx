import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

type StatusTone = 'success' | 'warning' | 'danger' | 'neutral' | 'violet';

export function StatusBadge({
  children,
  tone = 'neutral',
  pulse,
}: {
  children: React.ReactNode;
  tone?: StatusTone;
  pulse?: boolean;
}) {
  return (
    <Badge tone={tone} className="relative">
      <span
        className={cn(
          'size-1.5 rounded-full',
          tone === 'success' && 'bg-emerald-300',
          tone === 'warning' && 'bg-amber-300',
          tone === 'danger' && 'bg-red-300',
          tone === 'violet' && 'bg-[#9D7CFF]',
          tone === 'neutral' && 'bg-white/45',
          pulse && 'animate-soft-pulse'
        )}
      />
      {children}
    </Badge>
  );
}
