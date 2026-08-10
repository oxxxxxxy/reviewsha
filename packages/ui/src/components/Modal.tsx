import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

export interface ModalProps {
  readonly isOpen: boolean;
  readonly title: string;
  readonly children: ReactNode;
  readonly onClose: () => void;
}

export function Modal({ isOpen, title, children, onClose }: ModalProps) {
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    closeButton.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
  if (!isOpen) {
    return null;
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <header>
        <h2 id="modal-title">{title}</h2>
        <button ref={closeButton} type="button" onClick={onClose} aria-label="Close modal">
          ×
        </button>
      </header>
      <div>{children}</div>
    </div>
  );
}
