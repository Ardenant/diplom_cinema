// Главная страница = каталог фильмов.
// Серверный компонент: грузит фильмы из БД, считает минимальную цену по сеансам.

import Image from "next/image";
import Link from "next/link";
import { addDays, startOfDay } from "date-fns";

import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import { SiteHeader } from "@/components/site/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function CatalogPage() {
  const now = new Date();
  const horizon = addDays(startOfDay(now), 7); // показываем кино с сеансами на неделю вперёд

  const movies = await prisma.movie.findMany({
    where: {
      isActive: true,
      showtimes: { some: { startsAt: { gte: now, lt: horizon } } },
    },
    include: {
      genres: { select: { name: true } },
      showtimes: {
        where: { startsAt: { gte: now, lt: horizon } },
        select: { price: true },
        orderBy: { price: "asc" },
        take: 1, // нам нужна только минимальная цена
      },
    },
    orderBy: { releaseDate: "desc" },
  });

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="container mx-auto px-4 py-8 md:py-12">
          <div className="mb-6 md:mb-8">
            <h1
              className="text-3xl md:text-4xl font-bold tracking-tight"
              suppressHydrationWarning
            >
              Афиша
            </h1>
            <p className="mt-2 text-muted-foreground">
              Расписание сеансов на ближайшие 7 дней
            </p>
          </div>

          {movies.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                Сейчас нет фильмов в прокате. Загляните позже.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {movies.map((m) => (
                <MovieCard
                  key={m.id}
                  id={m.id}
                  title={m.title}
                  posterUrl={m.posterUrl}
                  ageRating={m.ageRating}
                  durationMin={m.durationMin}
                  genres={m.genres.map((g) => g.name)}
                  minPrice={m.showtimes[0] ? Number(m.showtimes[0].price) : null}
                />
              ))}
            </div>
          )}
        </section>
      </main>
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Кинотеатр — учебный проект
      </footer>
    </>
  );
}

function MovieCard({
  id,
  title,
  posterUrl,
  ageRating,
  durationMin,
  genres,
  minPrice,
}: {
  id: string;
  title: string;
  posterUrl: string | null;
  ageRating: string;
  durationMin: number;
  genres: string[];
  minPrice: number | null;
}) {
  return (
    <Link href={`/movies/${id}`} className="group">
      <Card className="overflow-hidden p-0 transition-shadow hover:shadow-lg h-full flex flex-col">
        <div className="relative aspect-[2/3] bg-muted">
          {posterUrl ? (
            <Image
              src={posterUrl}
              alt={title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
              Постер
            </div>
          )}
          <Badge className="absolute top-2 right-2" variant="secondary">
            {ageRating}
          </Badge>
        </div>
        <CardContent className="flex-1 flex flex-col p-4">
          <h3 className="font-semibold leading-tight line-clamp-2 mb-1">
            {title}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-1 mb-3">
            {genres.join(", ") || "без жанра"} · {durationMin} мин
          </p>
          <div className="mt-auto">
            <Button className="min-h-11 w-full" size="sm">
              {minPrice !== null ? `Билет от ${formatPrice(minPrice)}` : "Расписание"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
