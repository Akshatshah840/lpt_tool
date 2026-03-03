import { cn } from '@/lib/utils';

type Status =
  | 'PASS' | 'FAIL' | 'PENDING'
  | 'CREATED' | 'OPEN' | 'CLOSED'
  | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';

interface StatusBadgeProps {
  status: Status | boolean | null | undefined;
  className?: string;
}

const CONFIG: Record<string, { label: string; className: string }> = {
  PASS:        { label: 'Pass',        className: 'badge badge-success badge-sm' },
  FAIL:        { label: 'Fail',        className: 'badge badge-error badge-sm' },
  PENDING:     { label: 'Pending',     className: 'badge badge-warning badge-sm' },
  CREATED:     { label: 'Created',     className: 'badge badge-warning badge-sm' },
  OPEN:        { label: 'Open',        className: 'badge badge-info badge-sm' },
  CLOSED:      { label: 'Closed',      className: 'badge badge-neutral badge-sm' },
  ASSIGNED:    { label: 'Assigned',    className: 'badge badge-info badge-sm' },
  IN_PROGRESS: { label: 'In Progress', className: 'badge badge-warning badge-sm' },
  COMPLETED:   { label: 'Completed',   className: 'badge badge-success badge-sm' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  let key: string;
  if (status === true) key = 'PASS';
  else if (status === false) key = 'FAIL';
  else if (status == null) key = 'PENDING';
  else key = String(status);

  const config = CONFIG[key] ?? { label: key, className: 'badge badge-warning badge-sm' };

  return (
    <span className={cn('font-semibold tracking-wide', config.className, className)}>
      {config.label}
    </span>
  );
}
