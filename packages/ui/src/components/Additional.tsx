import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

export function IconButton({
  label,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} {...props}>
      {children}
    </button>
  );
}

export function Switch({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label>
      <input type="checkbox" role="switch" aria-label={label} {...props} /> {label}
    </label>
  );
}

export function Toast({ children, onClose }: { children: ReactNode; onClose?: () => void }) {
  return (
    <div role="status" className="ui-toast">
      {children}
      {onClose ? (
        <button type="button" aria-label="Close notification" onClick={onClose}>
          ×
        </button>
      ) : null}
    </div>
  );
}

export function Dropdown({ children }: { children: ReactNode }) {
  return <details className="ui-dropdown">{children}</details>;
}
