"use client";

// Диалог с подробностями билета: QR на каждое место + инструкция как пройти.
// QR создаётся локально из ticket.code, без запросов к внешним сервисам.

import { useState, type ReactNode } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Calendar, MapPin, Sofa, Info } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { plural, formatPrice } from "@/lib/format";
import { TicketQr } from "@/components/booking/ticket-qr";

type Ticket = {
  id: string;
  code: string;
  price: number | string;
  seat: { row: number; number: number };
};

type Booking = {
  id: string;
  totalPrice: number | string;
  showtime: {
    startsAt: Date;
    movie: { title: string };
    hall: { name: string };
  };
  tickets: Ticket[];
};

export function TicketDialog({
  booking,
  children,
}: {
  booking: Booking;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{booking.showtime.movie.title}</DialogTitle>
          <DialogDescription>
            Покажите QR на входе. Каждый билет — отдельный QR на конкретное
            место.
          </DialogDescription>
        </DialogHeader>

        {/* Основная информация */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>
              {format(booking.showtime.startsAt, "d MMMM yyyy, EEEE, HH:mm", {
                locale: ru,
              })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>{booking.showtime.hall.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Sofa className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>
              {plural(booking.tickets.length, ["билет", "билета", "билетов"])}{" "}
              на сумму {formatPrice(booking.totalPrice)}
            </span>
          </div>
        </div>

        <Separator />

        {/* QR-коды */}
        <div className="grid gap-4 sm:grid-cols-2">
          {booking.tickets.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-4 flex flex-col items-center text-center">
                <TicketQr
                  value={t.code}
                  label={`QR билета: ряд ${t.seat.row}, место ${t.seat.number}`}
                  size={200}
                  className="rounded border bg-white"
                />
                <p className="mt-3 font-semibold">
                  Ряд {t.seat.row}, место {t.seat.number}
                </p>
                <p className="text-xs text-muted-foreground font-mono mt-1 break-all">
                  {t.code}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Separator />

        {/* Инструкция */}
        <div className="rounded-md bg-muted/50 p-4 text-sm space-y-2">
          <div className="flex items-center gap-2 font-medium">
            <Info className="h-4 w-4" />
            Как пройти в кинотеатр
          </div>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>Приходите за 15 минут до начала сеанса.</li>
            <li>
              Покажите QR-код на турникете при входе в зону зрительных залов.
            </li>
            <li>
              Найдите свой зал по указателям и займите место согласно билету.
            </li>
            <li>
              При утере билета — обратитесь в кассу с email, на который
              оформляли заказ.
            </li>
          </ol>
          <p className="text-xs text-muted-foreground pt-2">
            Каждый QR-код содержит уникальный код билета и соответствует одному
            месту на сеансе.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
