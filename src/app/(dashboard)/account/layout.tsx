// Layout кабинета клиента. Сайдбар слева + topbar + основная область.
// Доступ ограничен middleware (только авторизованные).

import type { ReactNode } from "react";

import { auth } from "@/auth";
import { SidebarNav, type NavItem } from "@/components/dashboard/sidebar-nav";
import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";

// Иконки передаём именами (строками), а не самими компонентами — иначе Next.js
// ругается на сериализацию пропов из Server Component в Client Component.
const navItems: NavItem[] = [
  { title: "Мои билеты", href: "/account", icon: "Ticket" },
  { title: "Профиль", href: "/account/profile", icon: "User" },
  { title: "Смена пароля", href: "/account/password", icon: "KeyRound" },
  { title: "Баллы лояльности", href: "/account/loyalty", icon: "Sparkles" },
];

export default async function AccountLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  const userLabel = session?.user?.name ?? session?.user?.email ?? undefined;

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <SidebarNav
        items={navItems}
        title="Личный кабинет"
        userLabel={userLabel}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardTopbar variant="account" />
        <main className="flex-1 p-4 md:p-8 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
