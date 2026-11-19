"use server";

// Server Actions для личного кабинета: выход, обновление профиля, смена пароля.

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  changePasswordSchema,
  updateProfileSchema,
} from "@/lib/validations/auth";

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

export async function updateProfileAction(formData: unknown) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Не авторизован" };
  }

  const parsed = updateProfileSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const { name, image } = parsed.data;
  await prisma.user.update({
    where: { id: session.user.id },
    data: { name, image: image || null },
  });

  revalidatePath("/account");
  return { success: true };
}

export async function changePasswordAction(formData: unknown) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Не авторизован" };
  }

  const parsed = changePasswordSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const { currentPassword, newPassword } = parsed.data;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!user || !user.passwordHash) {
    return { success: false, error: "Пользователь не найден" };
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    return { success: false, error: "Текущий пароль неверен" };
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash },
  });

  return { success: true };
}
