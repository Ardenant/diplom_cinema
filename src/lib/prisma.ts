// Singleton PrismaClient для Next.js.
// В dev-режиме Next.js делает hot reload — без singleton каждый перезапуск создавал бы
// новое соединение, и БД быстро упёрлась бы в лимит коннектов. Глобальная переменная
// гарантирует, что клиент создаётся один раз за процесс.
//
// В Prisma v7 PrismaClient требует Driver Adapter — отдельный пакет, который реализует
// подключение через native-драйвер (node-postgres в нашем случае). Старые `datasourceUrl`
// и `datasources` больше не поддерживаются.

import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
