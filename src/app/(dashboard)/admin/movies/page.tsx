// Раздел "Фильмы" — список с краткой информацией.
// Формы CRUD добавим следующим шагом, когда у нас будут seed-данные.

import Link from "next/link";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Plus, Film as FilmIcon } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Фильмы — Админ" };

export default async function AdminMoviesPage() {
  const movies = await prisma.movie.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      genres: true,
      _count: { select: { showtimes: true } },
    },
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Фильмы</h1>
        <Button asChild>
          <Link href="/admin/movies/new">
            <Plus className="mr-2 h-4 w-4" />
            Добавить фильм
          </Link>
        </Button>
      </div>

      {movies.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center text-center py-12">
            <FilmIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Фильмов ещё нет</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {movies.map((m) => (
            <Card key={m.id}>
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold truncate">{m.title}</h3>
                    {!m.isActive && (
                      <Badge variant="secondary">Скрыт</Badge>
                    )}
                    <Badge variant="outline">{m.ageRating}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {m.durationMin} мин · {m.genres.map((g) => g.name).join(", ") || "без жанра"} ·
                    {" "}{format(m.releaseDate, "d MMM yyyy", { locale: ru })}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm text-muted-foreground">
                    {m._count.showtimes} сеансов
                  </span>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/movies/${m.id}`}>Редактировать</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
