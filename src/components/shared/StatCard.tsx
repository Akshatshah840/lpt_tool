import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  colorVar?: string;
  loading?: boolean;
  trend?: { value: number; label?: string };
}

export function StatCard({ icon, label, value, sub, colorVar = '--p', loading, trend }: StatCardProps) {
  if (loading) {
    return <div className="card p-5 h-[88px] skeleton" />;
  }
  return (
    <div
      className={cn('card p-5 ring-1 ring-primary/10')}
      style={{ borderLeft: '2px solid oklch(var(--p) / 0.35)' }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-base-content/50 text-sm">{label}</p>
          <p className="text-3xl font-bold text-base-content mt-1">{value}</p>
          {sub && <p className="text-base-content/40 text-xs mt-1">{sub}</p>}
          {trend && (
            <div className={cn(
              'flex items-center gap-1 mt-1.5 text-xs font-medium',
              trend.value > 0 ? 'text-success' : 'text-error'
            )}>
              {trend.value > 0
                ? <TrendingUp size={12} />
                : <TrendingDown size={12} />
              }
              <span>{trend.value > 0 ? '+' : ''}{trend.value}%</span>
              {trend.label && (
                <span className="text-base-content/40 font-normal ml-0.5">{trend.label}</span>
              )}
            </div>
          )}
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
