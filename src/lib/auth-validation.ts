import { z } from "zod";

/** Khớp BE: mật khẩu 5–64 ký tự */
export const passwordSchema = z
  .string()
  .min(5, "Mật khẩu tối thiểu 5 ký tự.")
  .max(64, "Mật khẩu tối đa 64 ký tự.");

export const emailSchema = z.string().min(1, "Vui lòng nhập email.").email("Email không hợp lệ.");
