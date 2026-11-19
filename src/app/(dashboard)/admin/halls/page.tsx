// Раздел "Залы". Карточка с разметкой каждого зала.

import Link from "next/link";
import { Plus, Sofa } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { pluralize } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Залы — Админ" };

const formatLabels: Record<string, string> = {
  STANDARD_2D: "Стандарт 2D",
  FORMAT_3D: "3D",
  IMAX: "IMAX",
  VIP: "VIP",
};

export default async function AdminHallsPage() {
  const halls = await prisma.hall.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { showtimes: true, seats: { where: { isActive: true } } },
      },
    },
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Залы</h1>
        <Button asChild>
          <Link href="/admin/halls/new">
            <Plus className="mr-2 h-4 w-4" />
            Добавить зал
          </Link>
        </Button>
      </div>

      {halls.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center text-center py-12">
            <Sofa className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Залов ещё нет</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {halls.map((h) => (
            <Card key={h.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle>{h.name}</CardTitle>
                  <Badge variant="secondary">{formatLabels[h.format]}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Разметка</span>
                  <span>
                    {h.rowsCount} {pluralize(h.rowsCount, ["ряд", "ряда", "рядов"])} · до{" "}
                    {h.seatsPerRow} мест в ряду
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Всего мест</span>
                  <span className="font-medium">{h._count.seats}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {pluralize(h._count.showtimes, ["Сеанс", "Сеанса", "Сеансов"])}
                  </span>
                  <span>{h._count.showtimes}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
