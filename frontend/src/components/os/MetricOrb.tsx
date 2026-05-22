import { cn } from '../../lib/utils';

export function MetricOrb({
  label,
  value,
  icon,
  tone = 'blue',
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  tone?: 'blue' | 'purple' | 'green' | 'amber';
}) {
  const glow = {
    blue: 'from-[#6E7BFF]/22 to-cyan-300/5 text-[#cdd2ff]',
    purple: 'from-[#9D7CFF]/24 to-fuchsia-300/5 text-[#ded1ff]',
    green: 'from-emerald-300/18 to-teal-300/5 text-emerald-200',
    amber: 'from-amber-300/18 to-orange-300/5 text-amber-200',
  }[tone];

  return (
    <div className={cn('glass-panel glass-hover rounded-[28px] p-5', 'bg-gradient-to-br', glow)}>
      <div className="mb-8 flex items-center justify-between">
        <div className="flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07] text-lg">
          {icon}
        </div>
        <span className="size-2 rounded-full bg-current shadow-[0_0_18px_currentColor]" />
      </div>
      <div className="text-4xl font-normal leading-none text-white">{value}</div>
      <div className="mt-2 text-sm text-white/52">{label}</div>
    </div>
  );
}
