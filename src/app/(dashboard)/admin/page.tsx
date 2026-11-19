// Дашборд админа: ключевые показатели по продажам + графики.
//
// Все агрегаты считаются на сервере одним Promise.all (параллельно), результаты
// передаются в клиентские Recharts-компоненты.

import { Ticket, Wallet, Percent, Film } from "lucide-react";
import { addDays, format, startOfDay } from "date-fns";
import { ru } from "date-fns/locale";

import { prisma } from "@/lib/prisma";
import { plural, formatPrice } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  HallFormatChart,
  SalesByDayChart,
  TopMoviesChart,
} from "@/components/admin/dashboard-charts";

export const metadata = { title: "Дашборд" };

const hallFormatLabels: Record<string, string> = {
  STANDARD_2D: "Стандарт 2D",
  FORMAT_3D: "3D",
  IMAX: "IMAX",
  VIP: "VIP",
};

export default async function AdminDashboard() {
  const today = startOfDay(new Date());
  const sevenDaysAgo = addDays(today, -6); // 7 точек включая сегодня

  const [
    totalTicketsSold,
    totalRevenue,
    activeMovies,
    totalShowtimes,
    occupancyData,
    topMoviesAgg,
    ticketsLast7Days,
    ticketsByFormat,
  ] = await Promise.all([
    prisma.ticket.count({ where: { booking: { status: "PAID" } } }),
    prisma.booking.aggregate({
      _sum: { totalPrice: true },
      where: { status: "PAID" },
    }),
    prisma.movie.count({ where: { isActive: true } }),
    prisma.showtime.count(),
    calcOccupancy(),
    // Топ-5 фильмов по проданным билетам
    prisma.ticket.findMany({
      where: { booking: { status: "PAID" } },
      include: { showtime: { select: { movie: { select: { title: true } } } } },
    }),
    // Продажи за 7 дней
    prisma.ticket.findMany({
      where: {
        booking: { status: "PAID" },
        createdAt: { gte: sevenDaysAgo },
      },
      select: { createdAt: true, price: true },
    }),
    // Распределение по форматам залов
    prisma.ticket.findMany({
      where: { booking: { status: "PAID" } },
      include: {
        showtime: { select: { hall: { select: { format: true } } } },
      },
    }),
  ]);

  // === Подготовка данных для графиков ===

  // Топ-5 фильмов: группируем в памяти и берём top-5.
  const topMoviesMap = new Map<string, number>();
  for (const t of topMoviesAgg) {
    const title = t.showtime.movie.title;
    topMoviesMap.set(title, (topMoviesMap.get(title) ?? 0) + 1);
  }
  const topMovies = [...topMoviesMap.entries()]
    .map(([title, tickets]) => ({ title, tickets }))
    .sort((a, b) => b.tickets - a.tickets)
    .slice(0, 5);

  // Продажи по дням (7 точек). Создаём словарь date → агрегат, заполняем нулями.
  const salesByDayMap = new Map<string, { tickets: number; revenue: number }>();
  for (let i = 0; i < 7; i++) {
    const d = addDays(sevenDaysAgo, i);
    const key = format(d, "yyyy-MM-dd");
    salesByDayMap.set(key, { tickets: 0, revenue: 0 });
  }
  for (const t of ticketsLast7Days) {
    const key = format(startOfDay(t.createdAt), "yyyy-MM-dd");
    const bucket = salesByDayMap.get(key);
    if (bucket) {
      bucket.tickets += 1;
      bucket.revenue += Number(t.price);
    }
  }
  const salesByDay = [...salesByDayMap.entries()].map(([key, v]) => ({
    date: format(new Date(key), "d MMM", { locale: ru }),
    tickets: v.tickets,
    revenue: v.revenue,
  }));

  // Распределение по форматам залов.
  const formatMap = new Map<string, number>();
  for (const t of ticketsByFormat) {
    const f = t.showtime.hall.format;
    formatMap.set(f, (formatMap.get(f) ?? 0) + 1);
  }
  const hallFormatData = [...formatMap.entries()].map(([format, value]) => ({
    name: hallFormatLabels[format] ?? format,
    value,
  }));

  const revenue = Number(totalRevenue._sum.totalPrice ?? 0);

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-6">
        Дашборд
      </h1>

      {/* Карточки KPI */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
        <Stat
          icon={Ticket}
          label="Продано билетов"
          value={totalTicketsSold.toLocaleString("ru-RU")}
        />
        <Stat icon={Wallet} label="Выручка" value={formatPrice(revenue)} />
        <Stat
          icon={Percent}
          label="Заполняемость"
          value={`${occupancyData}%`}
        />
        <Stat
          icon={Film}
          label="Активных фильмов"
          value={`${activeMovies} / ${plural(totalShowtimes, ["сеанс", "сеанса", "сеансов"])}`}
        />
      </div>

      {/* Графики */}
      <div className="grid gap-4 mb-6 grid-cols-1 lg:grid-cols-2">
        <SalesByDayChart data={salesByDay} />
        <TopMoviesChart data={topMovies} />
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <HallFormatChart data={hallFormatData} />

        <Card>
          <CardHeader>
            <CardTitle>Сводка</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Всего сеансов" value={totalShowtimes.toString()} />
            <Row label="Активных фильмов" value={activeMovies.toString()} />
            <Row
              label="Средняя выручка с билета"
              value={
                totalTicketsSold > 0
                  ? formatPrice(Math.round(revenue / totalTicketsSold))
                  : "—"
              }
            />
            <Row
              label="Средняя заполняемость"
              value={`${occupancyData}%`}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Ticket;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b last:border-0 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

// Заполняемость = (проданные билеты / суммарная вместимость прошедших сеансов) × 100
async function calcOccupancy(): Promise<number> {
  const now = new Date();
  const pastShowtimes = await prisma.showtime.findMany({
    where: { startsAt: { lte: now } },
    include: {
      hall: {
        select: { _count: { select: { seats: { where: { isActive: true } } } } },
      },
      tickets: { where: { booking: { status: "PAID" } }, select: { id: true } },
    },
  });

  if (pastShowtimes.length === 0) return 0;

  let totalCapacity = 0;
  let totalSold = 0;
  for (const st of pastShowtimes) {
    totalCapacity += st.hall._count.seats;
    totalSold += st.tickets.length;
  }

  if (totalCapacity === 0) return 0;
  return Math.round((totalSold / totalCapacity) * 100);
}
