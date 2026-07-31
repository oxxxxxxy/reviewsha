import type { HTMLAttributes, ReactNode } from 'react';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  readonly tone?: 'neutral' | 'success' | 'warning' | 'danger';
  readonly children: ReactNode;
}

export function Badge({ tone = 'neutral', children, ...props }: BadgeProps) {
  return (
    <span data-tone={tone} {...props}>
      {children}
    </span>
  );
}
