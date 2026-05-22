import { cn } from '../../lib/utils';

export function GlassPanel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn('glass-panel shimmer-border rounded-[32px]', className)}>
      {children}
    </section>
  );
}
