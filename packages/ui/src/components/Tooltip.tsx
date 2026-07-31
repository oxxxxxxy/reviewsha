import type { ReactNode } from 'react';

export interface TooltipProps {
  readonly content: ReactNode;
  readonly children: ReactNode;
}

export function Tooltip({ content, children }: TooltipProps) {
  return (
    <span>
      {children}
      <span role="tooltip">{content}</span>
    </span>
  );
}
