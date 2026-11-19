// Middleware Next.js, выполняется до рендера страницы на Edge Runtime.
// Использует ТОЛЬКО auth.config.ts (без adapter/bcrypt — они не работают на Edge).
// Логика разрешений в authorized() из конфига.

import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

export const { auth: middleware } = NextAuth(authConfig);
export default middleware((_req) => {
  // Логика уже в authConfig.callbacks.authorized — здесь ничего не делаем.
});

export const config = {
  // Матчер: все пути кроме API-роутов NextAuth, статики Next.js и публичных файлов.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
