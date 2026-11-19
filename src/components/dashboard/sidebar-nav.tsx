"use client";

// Универсальный сайдбар для кабинетов. На десктопе — фиксированная колонка слева,
// на мобильных скрывается за кнопкой и выезжает Sheet'ом.
//
// ВАЖНО: иконки приходят строкой (icon: "Ticket"), а не компонентом — иначе Next.js
// не может сериализовать пропы из Server Component в этот Client Component.

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  LogOut,
  Ticket,
  User as UserIcon,
  KeyRound,
  Sparkles,
  LayoutDashboard,
  Film,
  CalendarClock,
  Sofa,
  Receipt,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { signOutAction } from "@/lib/actions/account";

// Регистрируем все иконки, которые могут понадобиться в сайдбаре кабинетов.
// Если понадобится новая — добавляешь сюда строкой и в типе IconName.
const iconMap: Record<string, LucideIcon> = {
  Ticket,
  User: UserIcon,
  KeyRound,
  Sparkles,
  LayoutDashboard,
  Film,
  CalendarClock,
  Sofa,
  Receipt,
  Users,
};

export type IconName = keyof typeof iconMap;

export type NavItem = {
  title: string;
  href: string;
  icon: IconName;
};

export function SidebarNav({
  items,
  title,
  userLabel,
}: {
  items: NavItem[];
  title: string;
  userLabel?: string;
}) {
  return (
    <>
      {/* Десктоп-сайдбар: sticky + h-screen, чтобы кнопка "Выйти"
          всегда была у низа окна, даже если основная страница длиннее экрана. */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r bg-card sticky top-0 self-start h-screen">
        <SidebarContent items={items} title={title} userLabel={userLabel} />
      </aside>

      {/* Мобильный триггер */}
      <div className="md:hidden sticky top-0 z-30 flex items-center gap-2 border-b bg-background/95 backdrop-blur px-4 py-3">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Меню</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetTitle className="sr-only">Навигация</SheetTitle>
            <SidebarContent items={items} title={title} userLabel={userLabel} />
          </SheetContent>
        </Sheet>
        <span className="font-semibold">{title}</span>
      </div>
    </>
  );
}

function SidebarContent({
  items,
  title,
  userLabel,
}: {
  items: NavItem[];
  title: string;
  userLabel?: string;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="px-6 py-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
        {userLabel && (
          <p className="mt-1 font-semibold truncate">{userLabel}</p>
        )}
      </div>
      <Separator />

      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/account" &&
              item.href !== "/admin" &&
              pathname.startsWith(item.href));
          const Icon = iconMap[item.icon] ?? Ticket;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.title}
            </Link>
          );
        })}
      </nav>

      <Separator />
      <div className="p-3">
        <form action={signOutAction}>
          <Button
            type="submit"
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground"
          >
            <LogOut className="h-4 w-4" />
            Выйти
          </Button>
        </form>
      </div>
    </div>
  );
}
