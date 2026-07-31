import type { ReactNode } from 'react';

export interface PageShellProps {
  readonly title: string;
  readonly children: ReactNode;
}

export function PageShell({ title, children }: PageShellProps) {
  return (
    <main>
      <h1>{title}</h1>
      {children}
    </main>
  );
}
