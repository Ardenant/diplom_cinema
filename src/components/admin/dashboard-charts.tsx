"use client";

// Клиентские графики для дашборда. Recharts — стандарт React для бизнес-графики,
// внутри использует D3 для расчёта осей. Все диаграммы обёрнуты в ResponsiveContainer,
// чтобы автоматически растягиваться под ширину родителя на mobile/tablet/desktop.

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ── Продажи по дням ──────────────────────────────────────────────────────────

type SalesByDayPoint = {
  date: string;
  tickets: number;
  revenue: number;
};

export function SalesByDayChart({ data }: { data: SalesByDayPoint[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Продажи за 7 дней</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 90%)" />
            <XAxis dataKey="date" stroke="hsl(0 0% 50%)" fontSize={12} />
            <YAxis stroke="hsl(0 0% 50%)" fontSize={12} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: "white",
                border: "1px solid hsl(0 0% 90%)",
                borderRadius: 8,
                fontSize: 13,
              }}
              formatter={(value: number, name: string) => {
                if (name === "tickets") return [value, "Билетов"];
                if (name === "revenue")
                  return [`${value.toLocaleString("ru-RU")} ₽`, "Выручка"];
                return [value, name];
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 13 }}
              formatter={(v) => (v === "tickets" ? "Билеты" : "Выручка, ₽")}
            />
            <Bar dataKey="tickets" fill="hsl(220 70% 50%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="revenue" fill="hsl(160 60% 45%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ── Топ фильмов ──────────────────────────────────────────────────────────────

type TopMoviePoint = {
  title: string;
  tickets: number;
};

export function TopMoviesChart({ data }: { data: TopMoviePoint[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Топ фильмов по продажам</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-12 text-center">
            Пока нет проданных билетов.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 90%)" horizontal={false} />
              <XAxis type="number" stroke="hsl(0 0% 50%)" fontSize={12} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="title"
                stroke="hsl(0 0% 50%)"
                fontSize={12}
                width={150}
                tickFormatter={(t: string) => (t.length > 18 ? t.slice(0, 18) + "…" : t)}
              />
              <Tooltip
                contentStyle={{
                  background: "white",
                  border: "1px solid hsl(0 0% 90%)",
                  borderRadius: 8,
                  fontSize: 13,
                }}
                formatter={(v: number) => [v, "Билетов"]}
              />
              <Bar dataKey="tickets" fill="hsl(220 70% 50%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ── Распределение по форматам залов ──────────────────────────────────────────

type HallFormatPoint = {
  name: string;
  value: number;
};

const PIE_COLORS = [
  "hsl(220 70% 50%)",
  "hsl(160 60% 45%)",
  "hsl(40 90% 55%)",
  "hsl(0 70% 55%)",
];

export function HallFormatChart({ data }: { data: HallFormatPoint[] }) {
  const total = data.reduce((sum, p) => sum + p.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Билеты по форматам залов</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground py-12 text-center">
            Пока нет проданных билетов.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={2}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "white",
                  border: "1px solid hsl(0 0% 90%)",
                  borderRadius: 8,
                  fontSize: 13,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 13 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
