// Расширение типов NextAuth: добавляем role и id в session.user и JWT.
// Без этого TS будет ругаться на доступ к session.user.role.

import type { DefaultSession } from "next-auth";

type AppRole = "CLIENT" | "ADMIN";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: AppRole;
    } & DefaultSession["user"];
  }

  interface User {
    role: AppRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: AppRole;
  }
}
