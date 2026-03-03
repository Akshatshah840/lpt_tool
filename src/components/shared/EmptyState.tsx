interface EmptyStateProps {
  icon: React.ReactNode;
  heading: string;
  description?: string;
  colorVar?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export function EmptyState({
  icon,
  heading,
  description,
  colorVar = '--p',
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={`card p-14 text-center ${className ?? ''}`}>
      <div
        className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5 mx-auto"
        style={{
          background: `oklch(var(${colorVar}) / 0.1)`,
          border: `1px solid oklch(var(${colorVar}) / 0.18)`,
        }}
      >
        <span style={{ color: `oklch(var(${colorVar}) / 0.65)` }}>{icon}</span>
      </div>
      <p className="text-base-content/60 font-semibold text-base">{heading}</p>
      {description && (
        <p className="text-base-content/30 text-sm mt-2 max-w-xs mx-auto">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 btn btn-primary btn-sm"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
