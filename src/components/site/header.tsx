// Публичный хедер сайта. Серверный компонент — читает сессию напрямую через auth().

import Link from "next/link";
import { Film, User as UserIcon, ShieldCheck } from "lucide-react";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";

export async function SiteHeader() {
  const session = await auth();
  const isAuth = !!session?.user;
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" aria-label="Кинотеатр — афиша" className="flex min-h-11 min-w-11 items-center gap-2 font-semibold">
          <Film className="h-6 w-6" />
          <span className="hidden sm:inline">Кинотеатр</span>
        </Link>

        <nav className="flex items-center gap-2">
          {isAuth ? (
            <>
              {isAdmin && (
                <Button asChild variant="outline" size="sm" className="min-h-11 min-w-11">
                  <Link href="/admin" aria-label="Админ-панель">
                    <ShieldCheck className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Админ-панель</span>
                  </Link>
                </Button>
              )}
              <Button asChild size="sm" className="min-h-11 min-w-11">
                <Link href="/account" aria-label="Личный кабинет">
                  <UserIcon className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Личный кабинет</span>
                </Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="min-h-11">
                <Link href="/login">Войти</Link>
              </Button>
              <Button asChild size="sm" className="min-h-11">
                <Link href="/register">Регистрация</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
