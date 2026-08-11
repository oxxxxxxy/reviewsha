import type { HTMLAttributes, ReactNode } from 'react';

export function Sidebar({
  children,
  ...props
}: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return <aside {...props}>{children}</aside>;
}

export function Header({
  children,
  ...props
}: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return <header {...props}>{children}</header>;
}
