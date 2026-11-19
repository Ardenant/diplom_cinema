// Layout админ-панели. Защищён middleware (role !== "ADMIN" → редирект на /account).
// Дублирующая проверка на уровне layout — defence in depth.

import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { SidebarNav, type NavItem } from "@/components/dashboard/sidebar-nav";
import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";

// Иконки строками (см. комментарий в account/layout.tsx).
const navItems: NavItem[] = [
  { title: "Дашборд", href: "/admin", icon: "LayoutDashboard" },
  { title: "Фильмы", href: "/admin/movies", icon: "Film" },
  { title: "Сеансы", href: "/admin/showtimes", icon: "CalendarClock" },
  { title: "Залы", href: "/admin/halls", icon: "Sofa" },
  { title: "Бронирования", href: "/admin/bookings", icon: "Receipt" },
  { title: "Пользователи", href: "/admin/users", icon: "Users" },
];

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <SidebarNav
        items={navItems}
        title="Админ-панель"
        userLabel={session.user.name ?? session.user.email ?? undefined}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardTopbar variant="admin" />
        <main className="flex-1 p-4 md:p-8 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
