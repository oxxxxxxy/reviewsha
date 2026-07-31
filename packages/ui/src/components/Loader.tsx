import { Spinner } from './Spinner.js';

export interface LoaderProps {
  readonly label?: string;
}

export function Loader({ label = 'Loading...' }: LoaderProps) {
  return (
    <div role="status" aria-label={label}>
      <Spinner label={label} />
      <span>{label}</span>
    </div>
  );
}
