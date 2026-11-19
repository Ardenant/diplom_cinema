// Страница успешного оформления заказа /booking/[id].
// Показывает подтверждение, QR-коды на каждый билет, кнопки "В кабинет" и "К афише".
// Доступна и зарегистрированному, и гостю (по прямой ссылке).

import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { CheckCircle2, Calendar, MapPin, Mail } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { plural, formatPrice } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { TicketQr } from "@/components/booking/ticket-qr";

export default async function BookingSuccessPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      showtime: {
        include: {
          movie: { select: { title: true, posterUrl: true } },
          hall: { select: { name: true } },
        },
      },
      tickets: {
        include: { seat: true },
        orderBy: [{ seat: { row: "asc" } }, { seat: { number: "asc" } }],
      },
    },
  });

  if (!booking) notFound();

  return (
    <div
      className="container mx-auto px-4 py-8 md:py-12 max-w-3xl"
      data-cinema-booking
    >
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl md:text-3xl">
            Билеты оформлены
          </CardTitle>
          <p className="text-muted-foreground">
            Сохраните эту страницу с QR-кодами, чтобы вернуться к билетам.
          </p>
        </CardHeader>
        <CardContent>
          {/* Сводка */}
          <div className="space-y-2 mb-6">
            <h2 className="font-semibold text-lg">
              {booking.showtime.movie.title}
            </h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 shrink-0" />
              {format(booking.showtime.startsAt, "d MMMM yyyy, EEEE, HH:mm", {
                locale: ru,
              })}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" />
              {booking.showtime.hall.name}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4 shrink-0" />
              <span className="min-w-0 break-all">{booking.contactEmail}</span>
            </div>
          </div>

          <Separator className="mb-6" />

          {/* Билеты */}
          <h3 className="font-semibold mb-3">
            {plural(booking.tickets.length, ["билет", "билета", "билетов"])} ·{" "}
            {formatPrice(booking.totalPrice)}
          </h3>

          <div className="grid gap-3 sm:grid-cols-2">
            {booking.tickets.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 rounded-md border p-3"
              >
                <TicketQr
                  value={t.code}
                  label={`QR билета: ряд ${t.seat.row}, место ${t.seat.number}`}
                  size={112}
                  className="h-28 w-28 shrink-0 rounded border bg-white"
                />
                <div className="min-w-0">
                  <p className="font-medium">
                    Ряд {t.seat.row}, место {t.seat.number}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono break-all line-clamp-2">
                    {t.code}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <Separator className="my-6" />

          <div className="flex flex-col sm:flex-row gap-2">
            <Button asChild className="min-h-11 flex-1">
              <Link href={booking.userId ? "/account" : "/"}>
                {booking.userId ? "В личный кабинет" : "К афише"}
              </Link>
            </Button>
            <Button asChild variant="outline" className="min-h-11 flex-1">
              <Link href="/">Купить ещё</Link>
            </Button>
          </div>

          <p className="mt-6 text-xs text-muted-foreground text-center">
            Учебное оформление без списания средств. Отправка билетов по email
            пока недоступна.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
