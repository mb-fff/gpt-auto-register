import { GlassPanel } from './GlassPanel';
import { StatusBadge } from './StatusBadge';
import { cn } from '../../lib/utils';

export function WindowFrame({
  title,
  subtitle,
  status,
  children,
  className,
}: {
  title: string;
  subtitle: string;
  status?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <GlassPanel className={cn('min-h-[calc(100vh-128px)] overflow-hidden', className)}>
      <div className="flex flex-col gap-4 border-b border-white/[0.07] px-5 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-7">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-normal tracking-normal text-white sm:text-[34px]">{title}</h1>
          {subtitle && <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">{subtitle}</p>}
        </div>
        {status && <StatusBadge tone="violet" pulse>{status}</StatusBadge>}
      </div>
      <div className="p-5 lg:p-7">{children}</div>
    </GlassPanel>
  );
}
