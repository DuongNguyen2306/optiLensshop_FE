import Axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const apiBase =
  import.meta.env.VITE_API_BASE_URL ??
  import.meta.env.VITE_API_URL ??
  import.meta.env.REACT_APP_API_BASE_URL ??
  import.meta.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080";

type StoreLike = {
  getState: () => { auth?: { token?: string | null } };
  dispatch: (action: unknown) => unknown;
};

let injectedStore: StoreLike | null = null;
let unauthorizedHandler: (() => void) | null = null;

export const axios = Axios.create({
  baseURL: apiBase,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export const bindAxiosAuth = (
  store: StoreLike,
  onUnauthorized?: () => void
) => {
  injectedStore = store;
  unauthorizedHandler = onUnauthorized ?? null;
};

axios.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = injectedStore?.getState()?.auth?.token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});

axios.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const isUnauthorized = error.response?.status === 401;
    const requestPath = error.config?.url ?? "";
    const isAuthRequest =
      requestPath.includes("/auth/login") ||
      requestPath.includes("/auth/register") ||
      requestPath.includes("/auth/logout") ||
      requestPath.includes("/auth/forgot-password") ||
      requestPath.includes("/auth/reset-password") ||
      requestPath.includes("/auth/verify-email") ||
      requestPath.includes("/auth/resend-verification-email");

    if (isUnauthorized && !isAuthRequest) {
      unauthorizedHandler?.();
    }

    return Promise.reject(error);
  }
);

export default axios;
