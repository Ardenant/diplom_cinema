// Страница фильма /movies/[id]: описание + табы дней с сеансами.
// Серверный компонент, всё рендерится с данными из БД.

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { addDays, format, isSameDay, startOfDay } from "date-fns";
import { ru } from "date-fns/locale";
import { Clock, Calendar, MapPin } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import { getTimeSlot, timeSlotLabels, type TimeSlot } from "@/lib/time-slot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

const DAYS_AHEAD = 7;

const slotColors: Record<TimeSlot, string> = {
  morning: "bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-200",
  day: "bg-sky-100 text-sky-900 hover:bg-sky-200 dark:bg-sky-950 dark:text-sky-200",
  evening: "bg-violet-100 text-violet-900 hover:bg-violet-200 dark:bg-violet-950 dark:text-violet-200",
};

export default async function MoviePage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const now = new Date();
  const horizon = addDays(startOfDay(now), DAYS_AHEAD);

  const movie = await prisma.movie.findUnique({
    where: { id },
    include: {
      genres: true,
      showtimes: {
        where: { startsAt: { gte: now, lt: horizon } },
        include: { hall: { select: { name: true, format: true } } },
        orderBy: { startsAt: "asc" },
      },
    },
  });

  if (!movie || !movie.isActive) notFound();

  // Группируем сеансы по дням.
  const days: { date: Date; label: string; showtimes: typeof movie.showtimes }[] = [];
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const date = startOfDay(addDays(now, i));
    const showtimes = movie.showtimes.filter((s) => isSameDay(s.startsAt, date));
    if (showtimes.length === 0) continue;

    let label = format(date, "d MMM, EEE", { locale: ru });
    if (i === 0) label = `Сегодня · ${format(date, "d MMM", { locale: ru })}`;
    else if (i === 1) label = `Завтра · ${format(date, "d MMM", { locale: ru })}`;

    days.push({ date, label, showtimes });
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 max-w-6xl">
      <Link
        href="/"
        className="inline-flex min-h-11 items-center mb-4 text-sm text-muted-foreground hover:text-foreground"
      >
        ← К каталогу
      </Link>

      <div className="grid gap-6 md:gap-8 md:grid-cols-[280px_1fr] lg:grid-cols-[320px_1fr]">
        {/* Постер */}
        <div className="mx-auto md:mx-0 w-full max-w-[280px] md:max-w-none">
          <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-muted">
            {movie.posterUrl ? (
              <Image
                src={movie.posterUrl}
                alt={movie.title}
                fill
                sizes="(max-width: 768px) 280px, 320px"
                className="object-cover"
                priority
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                Постер
              </div>
            )}
          </div>
        </div>

        {/* Описание */}
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <Badge variant="outline">{movie.ageRating}</Badge>
            {movie.genres.map((g) => (
              <Badge key={g.id} variant="secondary">
                {g.name}
              </Badge>
            ))}
          </div>

          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
            {movie.title}
          </h1>

          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-muted-foreground mb-4">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {movie.durationMin} мин
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {format(movie.releaseDate, "d MMMM yyyy", { locale: ru })}
            </span>
          </div>

          <p className="text-base leading-relaxed mb-4">{movie.description}</p>

          {(movie.director || movie.cast) && (
            <div className="space-y-1 text-sm">
              {movie.director && (
                <p>
                  <span className="text-muted-foreground">Режиссёр: </span>
                  {movie.director}
                </p>
              )}
              {movie.cast && (
                <p>
                  <span className="text-muted-foreground">В ролях: </span>
                  {movie.cast}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <Separator className="my-8" />

      {/* Сеансы */}
      <section>
        <h2 className="text-2xl font-bold tracking-tight mb-4">Расписание</h2>

        {days.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Ближайших сеансов нет.
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue={format(days[0].date, "yyyy-MM-dd")}>
            <TabsList className="max-w-full justify-start gap-1 overflow-x-auto group-data-horizontal/tabs:h-auto">
              {days.map((d) => (
                <TabsTrigger
                  className="h-11 shrink-0 flex-none px-3"
                  key={d.date.toISOString()}
                  value={format(d.date, "yyyy-MM-dd")}
                >
                  {d.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {days.map((d) => (
              <TabsContent
                key={d.date.toISOString()}
                value={format(d.date, "yyyy-MM-dd")}
                className="mt-6"
              >
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {d.showtimes.map((s) => {
                    const slot = getTimeSlot(s.startsAt);
                    return (
                      <Link
                        key={s.id}
                        href={`/showtimes/${s.id}`}
                        className="block"
                      >
                        <Card className="hover:border-foreground/40 hover:shadow-md transition-all">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-2xl font-bold tabular-nums">
                                {format(s.startsAt, "HH:mm")}
                              </span>
                              <Badge className={slotColors[slot]}>
                                {timeSlotLabels[slot]}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                              <MapPin className="h-3.5 w-3.5" />
                              {s.hall.name}
                            </div>
                            <Button variant="default" size="sm" className="min-h-11 w-full pointer-events-none">
                              {formatPrice(s.price)}
                            </Button>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </section>
    </div>
  );
}
