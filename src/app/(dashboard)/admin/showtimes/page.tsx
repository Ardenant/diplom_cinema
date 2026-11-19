// Раздел "Сеансы" — список с быстрой фильтрацией по фильму/залу/дате.
// Полный CRUD добавляем после seed-данных.

import Link from "next/link";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Plus, CalendarClock } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { plural, formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Сеансы — Админ" };

export default async function AdminShowtimesPage() {
  const showtimes = await prisma.showtime.findMany({
    where: { startsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
    include: {
      movie: { select: { title: true } },
      hall: { select: { name: true } },
      _count: { select: { tickets: { where: { booking: { status: "PAID" } } } } },
    },
    take: 100,
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Сеансы</h1>
        <Button asChild>
          <Link href="/admin/showtimes/new">
            <Plus className="mr-2 h-4 w-4" />
            Создать сеанс
          </Link>
        </Button>
      </div>

      {showtimes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center text-center py-12">
            <CalendarClock className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Будущих сеансов нет</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {showtimes.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{s.movie.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {format(s.startsAt, "d MMM, EEEE HH:mm", { locale: ru })} ·{" "}
                    {s.hall.name}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant="secondary">{formatPrice(s.price)}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {plural(s._count.tickets, ["билет", "билета", "билетов"])}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
