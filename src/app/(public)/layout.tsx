// Layout для публичных под-страниц (фильм, выбор мест, успешная покупка).
// Главная страница / находится вне этой группы — у неё свой встроенный хедер.

import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site/header";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Кинотеатр — учебный проект
      </footer>
    </>
  );
}
