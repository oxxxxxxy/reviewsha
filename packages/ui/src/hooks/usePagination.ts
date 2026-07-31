import { useMemo, useState } from 'react';

export interface UsePaginationOptions {
  readonly initialPage?: number;
  readonly pageSize?: number;
  readonly totalItems: number;
}

export function usePagination({
  initialPage = 1,
  pageSize = 20,
  totalItems,
}: UsePaginationOptions) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const [page, setPage] = useState(Math.min(initialPage, totalPages));

  return useMemo(
    () => ({
      page,
      pageSize,
      totalItems,
      totalPages,
      setPage: (nextPage: number) => setPage(Math.min(Math.max(nextPage, 1), totalPages)),
    }),
    [page, pageSize, totalItems, totalPages],
  );
}
