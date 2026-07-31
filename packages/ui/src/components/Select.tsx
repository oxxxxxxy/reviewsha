import type { SelectHTMLAttributes } from 'react';

export interface SelectOption {
  readonly label: string;
  readonly value: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  readonly label?: string;
  readonly options: readonly SelectOption[];
}

export function Select({ id, label, options, ...props }: SelectProps) {
  const selectId = id ?? props.name;

  return (
    <div>
      {label ? <label htmlFor={selectId}>{label}</label> : null}
      <select id={selectId} {...props}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
