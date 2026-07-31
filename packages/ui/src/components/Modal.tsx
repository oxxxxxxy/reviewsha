import type { ReactNode } from 'react';

export interface ModalProps {
  readonly isOpen: boolean;
  readonly title: string;
  readonly children: ReactNode;
  readonly onClose: () => void;
}

export function Modal({ isOpen, title, children, onClose }: ModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={title}>
      <header>
        <h2>{title}</h2>
        <button type="button" onClick={onClose} aria-label="Close modal">
          ×
        </button>
      </header>
      <div>{children}</div>
    </div>
  );
}
