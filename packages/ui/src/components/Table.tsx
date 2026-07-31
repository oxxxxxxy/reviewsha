import type { ReactNode } from 'react';

export interface TableColumn<TRow> {
  readonly key: string;
  readonly header: ReactNode;
  readonly render: (row: TRow) => ReactNode;
}

export interface TableProps<TRow> {
  readonly rows: readonly TRow[];
  readonly columns: readonly TableColumn<TRow>[];
  readonly getRowKey: (row: TRow) => string;
  readonly emptyText?: string;
}

export function Table<TRow>({ rows, columns, getRowKey, emptyText = 'No data' }: TableProps<TRow>) {
  if (rows.length === 0) {
    return <p>{emptyText}</p>;
  }

  return (
    <table>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.key}>{column.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={getRowKey(row)}>
            {columns.map((column) => (
              <td key={column.key}>{column.render(row)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
