export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginationResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

