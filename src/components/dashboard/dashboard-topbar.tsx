// Верхняя плашка кабинета: справа кнопки навигации.
// Серверный компонент — читает сессию для определения роли.

import Link from "next/link";
import { ArrowLeft, ShieldCheck, User as UserIcon } from "lucide-react";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";

export async function DashboardTopbar({
  variant,
}: {
  variant: "account" | "admin";
}) {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <div className="flex items-center justify-end gap-2 border-b bg-background/95 backdrop-blur px-4 md:px-8 lg:px-10 h-14 shrink-0">
      <Button asChild variant="ghost" size="sm">
        <Link href="/">
          <ArrowLeft className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Вернуться на сайт</span>
        </Link>
      </Button>

      {/* Из кабинета клиента → в админку (только для админа) */}
      {variant === "account" && isAdmin && (
        <Button asChild variant="outline" size="sm">
          <Link href="/admin">
            <ShieldCheck className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Админ-панель</span>
          </Link>
        </Button>
      )}

      {/* Из админки → в кабинет клиента */}
      {variant === "admin" && (
        <Button asChild variant="outline" size="sm">
          <Link href="/account">
            <UserIcon className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Личный кабинет</span>
          </Link>
        </Button>
      )}
    </div>
  );
}
