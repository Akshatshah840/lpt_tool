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
  PASS:        { label: 'Pass',        className: 'badge-pass' },
  FAIL:        { label: 'Fail',        className: 'badge-fail' },
  PENDING:     { label: 'Pending',     className: 'badge-pending' },
  CREATED:     { label: 'Created',     className: 'badge-pending' },
  OPEN:        { label: 'Open',        className: 'badge-open' },
  CLOSED:      { label: 'Closed',      className: 'badge-closed' },
  ASSIGNED:    { label: 'Assigned',    className: 'badge-assigned' },
  IN_PROGRESS: { label: 'In Progress', className: 'badge-pending' },
  COMPLETED:   { label: 'Completed',   className: 'badge-completed' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  let key: string;
  if (status === true) key = 'PASS';
  else if (status === false) key = 'FAIL';
  else if (status == null) key = 'PENDING';
  else key = String(status);

  const config = CONFIG[key] ?? { label: key, className: 'badge-pending' };

  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide', config.className, className)}>
      {config.label}
    </span>
  );
}
