"use server";

// Server Actions для регистрации и входа.
// Server Action — это функция, помеченная "use server", которую можно вызвать
// прямо из клиентского компонента: Next.js под капотом превратит вызов в POST
// и выполнит код на сервере. Это альтернатива классическим API-роутам.

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";

import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { loginSchema, registerSchema } from "@/lib/validations/auth";

export type ActionResult = {
  success: boolean;
  error?: string;
};

export async function registerAction(formData: unknown): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Некорректные данные" };
  }

  const { name, email, password } = parsed.data;

  // Проверяем, нет ли уже такого email.
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { success: false, error: "Пользователь с таким email уже зарегистрирован" };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "CLIENT",
    },
  });

  // После регистрации сразу логиним пользователя.
  try {
    await signIn("credentials", { email, password, redirectTo: "/account" });
  } catch (error) {
    // signIn кидает специальное исключение для редиректа — пробрасываем его дальше.
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    return { success: false, error: "Не удалось войти после регистрации" };
  }

  return { success: true };
}

export async function loginAction(formData: unknown): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Некорректные данные" };
  }

  try {
    await signIn("credentials", {
      ...parsed.data,
      redirectTo: "/account",
    });
  } catch (error) {
    // NEXT_REDIRECT — это нормально, его надо пробросить, чтобы сработал редирект.
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;

    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { success: false, error: "Неверный email или пароль" };
        default:
          return { success: false, error: "Ошибка входа" };
      }
    }
    throw error;
  }

  return { success: true };
}
