// Раздел "Пользователи" — список с возможностью сменить роль.
// Смена роли реализована Server Action в форме напротив каждого пользователя.

import { format } from "date-fns";
import { ru } from "date-fns/locale";

import { prisma } from "@/lib/prisma";
import { plural } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserRoleSwitcher } from "@/components/admin/user-role-switcher";

export const metadata = { title: "Пользователи — Админ" };

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { bookings: true } },
    },
  });

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-6">
        Пользователи
      </h1>

      <div className="grid gap-3">
        {users.map((u) => (
          <Card key={u.id}>
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-semibold truncate">
                    {u.name || "Без имени"}
                  </h3>
                  <Badge variant={u.role === "ADMIN" ? "default" : "secondary"}>
                    {u.role === "ADMIN" ? "Админ" : "Клиент"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {u.email}
                </p>
                <p className="text-xs text-muted-foreground">
                  Регистрация: {format(u.createdAt, "d MMM yyyy", { locale: ru })}
                  {" · "}
                  {plural(u._count.bookings, ["покупка", "покупки", "покупок"])}
                  {" · "}
                  {plural(u.loyaltyPoints, ["балл", "балла", "баллов"])}
                </p>
              </div>
              <UserRoleSwitcher userId={u.id} currentRole={u.role} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
