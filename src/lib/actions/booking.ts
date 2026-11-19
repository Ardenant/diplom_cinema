"use server";

// Server Action создания заказа: одна транзакция, защита от двойной продажи через
// @@unique([showtimeId, seatId]) в схеме (если два пользователя одновременно нажмут
// "Оформить" на одно место — второй получит сообщение о конфликте после P2002).

import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const inputSchema = z.object({
  showtimeId: z.string().min(1),
  seatIds: z.array(z.string().min(1)).min(1, "Выберите хотя бы одно место"),
  contactEmail: z.string().email("Некорректный email"),
});

export type CreateBookingResult =
  { success: true; bookingId: string } | { success: false; error: string };

export async function createBookingAction(
  input: unknown,
): Promise<CreateBookingResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Некорректные данные",
    };
  }

  const { showtimeId, seatIds, contactEmail } = parsed.data;
  const session = await auth();
  const userId = session?.user?.id ?? null;

  try {
    const booking = await prisma.$transaction(async (tx) => {
      // 1. Проверяем, что сеанс существует и ещё не прошёл.
      const showtime = await tx.showtime.findUnique({
        where: { id: showtimeId },
        include: { hall: { select: { id: true } } },
      });
      if (!showtime) throw new Error("Сеанс не найден");
      if (showtime.startsAt < new Date()) {
        throw new Error("Сеанс уже начался — продажи закрыты");
      }

      // 2. Проверяем, что все указанные места реально принадлежат этому залу.
      const seats = await tx.seat.findMany({
        where: { id: { in: seatIds }, hallId: showtime.hall.id, isActive: true },
      });
      if (seats.length !== seatIds.length) {
        throw new Error("Некоторые места недоступны для этого сеанса. Обновите схему и выберите другие.");
      }

      const totalPrice = Number(showtime.price) * seatIds.length;

      // 3. Создаём Booking + Tickets одной транзакцией.
      // Уникальность (showtimeId, seatId) защищает от двойной продажи на уровне БД.
      return tx.booking.create({
        data: {
          userId,
          showtimeId,
          contactEmail,
          status: "PAID", // в дипломе подключу реальный платёж, пока сразу PAID
          totalPrice,
          tickets: {
            create: seatIds.map((seatId) => ({
              showtimeId,
              seatId,
              price: showtime.price,
            })),
          },
        },
      });
    });

    return { success: true, bookingId: booking.id };
  } catch (error) {
    // Конфликт уникальности — кто-то успел купить место первее.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        error:
          "Одно из выбранных мест только что заняли. Мы обновили схему — проверьте выбор и добавьте другие места.",
      };
    }

    const message =
      error instanceof Error ? error.message : "Ошибка оформления";
    return { success: false, error: message };
  }
}
