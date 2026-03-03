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
        'card',
        hover && 'hover:shadow-xl hover:-translate-y-0.5 cursor-pointer transition-all',
        glow && 'ring-1 ring-primary/10',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
