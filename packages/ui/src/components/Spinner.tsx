export interface SpinnerProps {
  readonly label?: string;
}

export function Spinner({ label = 'Loading' }: SpinnerProps) {
  return (
    <span role="status" aria-label={label}>
      ⏳
    </span>
  );
}
