// Layout для страниц авторизации (/login, /register).
// Группа (auth) в скобках — это route group в App Router: путь не влияет на URL,
// но позволяет навесить общий layout только на эти страницы.

import type { ReactNode } from "react";
import Link from "next/link";
import { Film } from "lucide-react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 px-4 py-8">
      <Link
        href="/"
        className="mb-8 flex items-center gap-2 text-2xl font-semibold tracking-tight"
      >
        <Film className="h-7 w-7" />
        Кинотеатр
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
