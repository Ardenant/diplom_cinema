// Главная страница кабинета клиента: «Мои билеты» с вкладками.

import Link from "next/link";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Ticket as TicketIcon, Calendar, MapPin } from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { plural, formatPrice } from "@/lib/format";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TicketDialog } from "@/components/account/ticket-dialog";

export default async function MyTicketsPage() {
  const session = await auth();
  const userId = session!.user.id;

  const now = new Date();

  const bookings = await prisma.booking.findMany({
    where: { userId, status: "PAID" },
    include: {
      showtime: { include: { movie: true, hall: true } },
      tickets: { include: { seat: true } },
    },
    orderBy: { showtime: { startsAt: "desc" } },
  });

  const upcoming = bookings.filter((b) => b.showtime.startsAt > now);
  const past = bookings.filter((b) => b.showtime.startsAt <= now);

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-6">
        Мои билеты
      </h1>

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">
            Предстоящие
            <Badge variant="secondary" className="ml-2">
              {upcoming.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="past">
            Прошедшие
            <Badge variant="secondary" className="ml-2">
              {past.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6">
          {upcoming.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-4">
              {upcoming.map((b) => (
                <BookingCard key={b.id} booking={b} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-6">
          {past.length === 0 ? (
            <p className="text-muted-foreground">Истории покупок пока нет.</p>
          ) : (
            <div className="space-y-4">
              {past.map((b) => (
                <BookingCard key={b.id} booking={b} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center text-center py-12">
        <TicketIcon className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="font-semibold mb-1">Билетов пока нет</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Выберите фильм и оформите первый билет
        </p>
        <Button asChild>
          <Link href="/">В каталог фильмов</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BookingCard({ booking }: { booking: any }) {
  const { showtime, tickets } = booking;
  const seats = tickets
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((t: any) => `${t.seat.row}-${t.seat.number}`)
    .join(", ");

  // Сериализуем Prisma.Decimal в числа: Client Components не принимают объекты с методами.
  const serializedBooking = {
    id: booking.id,
    totalPrice: Number(booking.totalPrice),
    showtime: {
      startsAt: booking.showtime.startsAt,
      movie: { title: booking.showtime.movie.title },
      hall: { name: booking.showtime.hall.name },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tickets: booking.tickets.map((t: any) => ({
      id: t.id,
      code: t.code,
      price: Number(t.price),
      seat: { row: t.seat.row, number: t.seat.number },
    })),
  };

  return (
    <TicketDialog booking={serializedBooking}>
      <Card className="cursor-pointer hover:bg-accent/40 transition-colors">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="space-y-2 min-w-0">
              <h3 className="font-semibold text-lg truncate">
                {showtime.movie.title}
              </h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4 shrink-0" />
                {format(showtime.startsAt, "d MMMM, HH:mm", { locale: ru })}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0" />
                {showtime.hall.name} · места {seats}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-2xl font-bold">
                {formatPrice(booking.totalPrice)}
              </div>
              <Badge className="mt-1">
                {plural(tickets.length, ["билет", "билета", "билетов"])}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </TicketDialog>
  );
}
