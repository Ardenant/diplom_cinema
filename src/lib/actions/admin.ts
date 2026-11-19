"use server";

// Server Actions для админки.

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Доступ запрещён");
  }
  return session.user;
}

export async function setUserRoleAction(
  userId: string,
  role: "CLIENT" | "ADMIN",
) {
  const admin = await requireAdmin();

  // Защита от самопонижения: админ не может снять с себя роль ADMIN.
  if (admin.id === userId && role !== "ADMIN") {
    return { success: false, error: "Нельзя снять админские права с себя" };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role },
  });

  revalidatePath("/admin/users");
  return { success: true };
}
