import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "@/lib/axios";

/** User trả về từ BE sau đăng nhập / đăng ký (có token). */
export interface User {
  id: string;
  email: string;
  role: string;
  status: string;
  is_email_verified: boolean;
}

/** Body BE cho POST /auth/login */
export interface LoginPayload {
  email: string;
  password: string;
}

/** Body BE cho POST /auth/register */
export interface RegisterPayload {
  email: string;
  password: string;
  confirm_password: string;
}

/** Response BE (rút gọn) — dùng access_token, không dùng field token. */
export interface LoginApiResponse {
  message?: string;
  access_token: string;
  user: User;
}

/** Payload chuẩn hóa lưu Redux */
export interface AuthSuccessPayload {
  user: User;
  token: string;
  message?: string;
}

/** Đăng ký thành công nhưng chưa cấp token (chỉ message). */
export interface RegisterPendingVerificationPayload {
  user: null;
  token: null;
  message?: string;
}

export type RegisterResultPayload = AuthSuccessPayload | RegisterPendingVerificationPayload;

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

const getErrorMessage = (error: unknown) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: unknown }).response === "object" &&
    (error as { response?: unknown }).response !== null
  ) {
    const data = (error as { response: { data?: unknown } }).response?.data;
    if (typeof data === "object" && data !== null) {
      const msg = (data as { message?: unknown }).message;
      const err = (data as { error?: unknown }).error;
      if (typeof msg === "string" && msg.trim()) {
        return msg;
      }
      if (typeof err === "string" && err.trim()) {
        return err;
      }
    }
  }

  return "Đã có lỗi xảy ra. Vui lòng thử lại.";
};

const persistAuthCookie = (token: string | null) => {
  if (typeof document === "undefined") {
    return;
  }

  if (!token) {
    document.cookie =
      "auth_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
    return;
  }

  const sevenDaysInSeconds = 60 * 60 * 24 * 7;
  document.cookie = `auth_token=${token}; Path=/; Max-Age=${sevenDaysInSeconds}; SameSite=Lax`;
};

const mapLoginResponse = (data: LoginApiResponse): AuthSuccessPayload => ({
  user: data.user,
  token: data.access_token,
  message: data.message,
});

export const login = createAsyncThunk<AuthSuccessPayload, LoginPayload, { rejectValue: string }>(
  "auth/login",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await axios.post<LoginApiResponse>("/auth/login", {
        email: payload.email.trim().toLowerCase(),
        password: payload.password,
      });
      return mapLoginResponse(response.data);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const register = createAsyncThunk<RegisterResultPayload, RegisterPayload, { rejectValue: string }>(
  "auth/register",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await axios.post<LoginApiResponse | { message?: string }>("/auth/register", {
        email: payload.email.trim().toLowerCase(),
        password: payload.password,
        confirm_password: payload.confirm_password,
      });
      const data = response.data;
      if ("access_token" in data && data.access_token && "user" in data && data.user) {
        return mapLoginResponse(data as LoginApiResponse);
      }
      return {
        user: null,
        token: null,
        message: typeof (data as { message?: string }).message === "string" ? (data as { message: string }).message : undefined,
      };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const logout = createAsyncThunk<void, void, { rejectValue: string }>(
  "auth/logout",
  async (_, { rejectWithValue }) => {
    try {
      await axios.post("/auth/logout");
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const getMe = createAsyncThunk<User, void, { rejectValue: string }>(
  "auth/getMe",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get<{ user: User }>("/auth/me");
      return response.data.user;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const verifyEmail = createAsyncThunk<string, string, { rejectValue: string }>(
  "auth/verifyEmail",
  async (token, { rejectWithValue }) => {
    try {
      const response = await axios.get<{ message?: string }>("/auth/verify-email", {
        params: { token },
      });
      return response.data.message ?? "Xác thực email thành công.";
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const resendVerificationEmail = createAsyncThunk<string, { email: string }, { rejectValue: string }>(
  "auth/resendVerificationEmail",
  async ({ email }, { rejectWithValue }) => {
    try {
      const response = await axios.post<{ message?: string }>("/auth/resend-verification-email", {
        email: email.trim().toLowerCase(),
      });
      return response.data.message ?? "Đã gửi lại email xác thực.";
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const forgotPassword = createAsyncThunk<string, { email: string }, { rejectValue: string }>(
  "auth/forgotPassword",
  async ({ email }, { rejectWithValue }) => {
    try {
      const response = await axios.post<{ message?: string }>("/auth/forgot-password", {
        email: email.trim().toLowerCase(),
      });
      return response.data.message ?? "Nếu email tồn tại, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.";
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export interface ResetPasswordPayload {
  token: string;
  password: string;
  confirm_password: string;
}

export const resetPassword = createAsyncThunk<string, ResetPasswordPayload, { rejectValue: string }>(
  "auth/resetPassword",
  async ({ token, password, confirm_password }, { rejectWithValue }) => {
    try {
      const response = await axios.post<{ message?: string }>(
        "/auth/reset-password",
        { password, confirm_password },
        { params: { token } }
      );
      return response.data.message ?? "Đặt lại mật khẩu thành công.";
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
  confirm_new_password: string;
}

export const changePassword = createAsyncThunk<string, ChangePasswordPayload, { rejectValue: string }>(
  "auth/changePassword",
  async (body, { rejectWithValue }) => {
    try {
      const response = await axios.post<{ message?: string }>("/auth/change-password", body);
      return response.data.message ?? "Đổi mật khẩu thành công.";
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearAuth(state) {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      persistAuthCookie(null);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
        persistAuthCookie(action.payload.token);
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Đăng nhập thất bại.";
      })
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        if (action.payload.token && action.payload.user) {
          state.user = action.payload.user;
          state.token = action.payload.token;
          state.isAuthenticated = true;
          persistAuthCookie(action.payload.token);
        }
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Đăng ký thất bại.";
      })
      .addCase(getMe.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getMe.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(getMe.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Không thể lấy thông tin người dùng.";
      })
      .addCase(logout.pending, (state) => {
        state.loading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.loading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = null;
        persistAuthCookie(null);
      })
      .addCase(logout.rejected, (state, action) => {
        state.loading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = action.payload ?? null;
        persistAuthCookie(null);
      });
  },
});

export const { clearAuth } = authSlice.actions;
export default authSlice.reducer;
