// Zod-схемы валидации форм авторизации. Используются и на клиенте (react-hook-form),
// и на сервере (Server Actions) — одна схема, два места применения, единый источник правды.

import { z } from "zod";

export const registerSchema = z
  .object({
    name: z.string().min(2, "Имя должно содержать минимум 2 символа"),
    email: z.string().email("Некорректный email"),
    password: z
      .string()
      .min(6, "Пароль должен быть минимум 6 символов")
      .max(72, "Максимум 72 символа"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Пароли не совпадают",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().email("Некорректный email"),
  password: z.string().min(1, "Введите пароль"),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2, "Имя должно содержать минимум 2 символа"),
  image: z.string().url("Некорректная ссылка").optional().or(z.literal("")),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Введите текущий пароль"),
    newPassword: z
      .string()
      .min(6, "Новый пароль минимум 6 символов")
      .max(72),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Пароли не совпадают",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
