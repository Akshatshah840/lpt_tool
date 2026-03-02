import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  glow?: boolean;
}

export function GlassCard({ className, children, hover, glow, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        'glass-card',
        hover && 'glass-card-hover cursor-pointer transition-all',
        glow && 'stat-card-glow',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
