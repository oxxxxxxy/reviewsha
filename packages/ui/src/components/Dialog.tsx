import type { ReactNode } from 'react';
import { Button } from './Button.js';

export interface DialogProps {
  readonly title: string;
  readonly description?: string;
  readonly children?: ReactNode;
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
  readonly onConfirm?: () => void;
  readonly onCancel?: () => void;
}

export function Dialog({
  title,
  description,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: DialogProps) {
  return (
    <section role="alertdialog" aria-label={title}>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {children}
      <footer>
        <Button variant="secondary" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button onClick={onConfirm}>{confirmLabel}</Button>
      </footer>
    </section>
  );
}
