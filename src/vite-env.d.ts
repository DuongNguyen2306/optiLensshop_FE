/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_API_URL?: string;
  /** Tương thích CRA */
  readonly REACT_APP_API_BASE_URL?: string;
  /** Tương thích tên biến kiểu Next — nên dùng VITE_API_BASE_URL */
  readonly NEXT_PUBLIC_API_BASE_URL?: string;
  readonly VITE_API_DOCS_URL?: string;
  /** "true" = hiện link Swagger ở footer cả khi build production */
  readonly VITE_SHOW_API_DOCS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
