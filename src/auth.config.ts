// Edge-safe конфигурация NextAuth v5.
// Этот файл используется в middleware.ts (Edge Runtime),
// поэтому здесь НЕЛЬЗЯ импортировать Prisma, bcrypt и другие Node-only модули.
// Полная конфигурация с adapter и providers — в src/auth.ts.

import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    // Проверка доступа к защищённым маршрутам. Запускается из middleware.
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const role = auth?.user?.role;

      const isOnAdmin = nextUrl.pathname.startsWith("/admin");
      const isOnAccount = nextUrl.pathname.startsWith("/account");
      const isOnAuthPages =
        nextUrl.pathname.startsWith("/login") ||
        nextUrl.pathname.startsWith("/register");

      // /admin — только для ADMIN
      if (isOnAdmin) {
        if (!isLoggedIn) {
          return Response.redirect(new URL("/login", nextUrl));
        }
        if (role !== "ADMIN") {
          return Response.redirect(new URL("/account", nextUrl));
        }
        return true;
      }

      // /account — для любого авторизованного
      if (isOnAccount) {
        if (!isLoggedIn) {
          return Response.redirect(new URL("/login", nextUrl));
        }
        return true;
      }

      // /login и /register недоступны уже залогиненным
      if (isOnAuthPages && isLoggedIn) {
        const target = role === "ADMIN" ? "/admin" : "/account";
        return Response.redirect(new URL(target, nextUrl));
      }

      return true;
    },
    // Прокидываем role и id из JWT в session.user, чтобы они были доступны в коде.
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "CLIENT" | "ADMIN";
      }
      return session;
    },
  },
  providers: [], // настоящие провайдеры — в auth.ts (там работает Node-API)
} satisfies NextAuthConfig;
