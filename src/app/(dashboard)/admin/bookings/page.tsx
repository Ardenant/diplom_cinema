// Раздел "Бронирования" — список всех заказов с фильтрацией по статусу.

import { format } from "date-fns";
import { ru } from "date-fns/locale";

import { prisma } from "@/lib/prisma";
import { plural, formatPrice } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Бронирования — Админ" };

const statusLabels: Record<string, string> = {
  PENDING: "Ожидает оплаты",
  PAID: "Оплачен",
  CANCELLED: "Отменён",
};

const statusVariants: Record<string, "default" | "secondary" | "destructive"> = {
  PENDING: "secondary",
  PAID: "default",
  CANCELLED: "destructive",
};

export default async function AdminBookingsPage() {
  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { name: true, email: true } },
      showtime: {
        include: {
          movie: { select: { title: true } },
          hall: { select: { name: true } },
        },
      },
      tickets: { select: { id: true } },
    },
  });

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-6">
        Бронирования
      </h1>

      {bookings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Бронирований ещё нет
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {bookings.map((b) => (
            <Card key={b.id}>
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold truncate">
                      {b.showtime.movie.title}
                    </h3>
                    <Badge variant={statusVariants[b.status]}>
                      {statusLabels[b.status]}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {format(b.showtime.startsAt, "d MMM HH:mm", { locale: ru })} ·{" "}
                    {b.showtime.hall.name} ·{" "}
                    {plural(b.tickets.length, ["билет", "билета", "билетов"])}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {b.user
                      ? `${b.user.name ?? "—"} (${b.user.email})`
                      : `Гость: ${b.contactEmail}`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold">{formatPrice(b.totalPrice)}</div>
                  <div className="text-xs text-muted-foreground">
                    {format(b.createdAt, "d MMM HH:mm", { locale: ru })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
