import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  colorVar?: string;
  loading?: boolean;
}

export function StatCard({ icon, label, value, sub, colorVar = '--p', loading }: StatCardProps) {
  if (loading) {
    return <div className="card p-6 h-[100px] skeleton" />;
  }
  return (
    <div className={cn('card p-5 ring-1 ring-primary/10')}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-base-content/50 text-sm">{label}</p>
          <p className="text-3xl font-bold text-base-content mt-1">{value}</p>
          {sub && <p className="text-base-content/40 text-xs mt-1">{sub}</p>}
        </div>
        <div
          className="p-3 rounded-xl flex-shrink-0"
          style={{
            background: `oklch(var(${colorVar}) / 0.13)`,
            border: `1px solid oklch(var(${colorVar}) / 0.2)`,
          }}
        >
          <span style={{ color: `oklch(var(${colorVar}))` }}>{icon}</span>
        </div>
      </div>
    </div>
  );
}
