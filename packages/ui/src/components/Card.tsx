import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  readonly title?: string;
  readonly children: ReactNode;
}

export function Card({ title, children, ...props }: CardProps) {
  return (
    <section {...props}>
      {title ? <h2>{title}</h2> : null}
      {children}
    </section>
  );
}
