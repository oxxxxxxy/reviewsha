export interface ApiError {
  code: string;
  message: string;
}

export interface ApiResponse<TData = unknown, TMeta = Record<string, unknown>> {
  data: TData;
  meta?: TMeta;
}

export interface ApiErrorResponse {
  error: ApiError;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}
