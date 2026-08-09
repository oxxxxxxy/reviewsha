import type { ElementType, HTMLAttributes, LabelHTMLAttributes, ReactNode } from 'react';

export function Container({
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className="ui-container" {...props}>
      {children}
    </div>
  );
}

export function Stack({
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className="ui-stack" {...props}>
      {children}
    </div>
  );
}

export function Grid({
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className="ui-grid" {...props}>
      {children}
    </div>
  );
}

export function Page({
  children,
  ...props
}: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return (
    <main className="ui-page" {...props}>
      {children}
    </main>
  );
}

export function Heading({
  level = 1,
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement> & { level?: 1 | 2 | 3 | 4; children: ReactNode }) {
  const Tag = `h${level}` as ElementType;
  return (
    <Tag className="ui-heading" {...props}>
      {children}
    </Tag>
  );
}

export function Text({
  children,
  ...props
}: HTMLAttributes<HTMLParagraphElement> & { children: ReactNode }) {
  return (
    <p className="ui-text" {...props}>
      {children}
    </p>
  );
}

export function Label({
  children,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement> & { children: ReactNode }) {
  return (
    <label className="ui-label" {...props}>
      {children}
    </label>
  );
}

export function Alert({
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div role="alert" className="ui-alert" {...props}>
      {children}
    </div>
  );
}

export function Skeleton({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={`ui-skeleton ${className}`.trim()} {...props} />;
}
