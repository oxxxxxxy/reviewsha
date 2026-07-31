import type { TextareaHTMLAttributes } from 'react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  readonly label?: string;
  readonly error?: string;
}

export function Textarea({ id, label, error, ...props }: TextareaProps) {
  const textareaId = id ?? props.name;

  return (
    <div>
      {label ? <label htmlFor={textareaId}>{label}</label> : null}
      <textarea
        id={textareaId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${textareaId}-error` : undefined}
        {...props}
      />
      {error ? (
        <span id={`${textareaId}-error`} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
