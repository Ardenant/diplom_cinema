// Synchronise the reference plan while retaining all historical seats and bookings.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { ensureHallLayout, HALL_LAYOUTS } from "./hall-layouts";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const result = await prisma.$transaction(async (transaction) => {
    const halls = [];
    for (const layout of HALL_LAYOUTS) {
      const { hall, added, archived, restored, capacity } =
        await ensureHallLayout(transaction, layout);
      halls.push({
        name: hall.name,
        rows: hall.rowsCount,
        seatsPerRow: hall.seatsPerRow,
        total: capacity,
        added,
        archived,
        restored,
      });
    }
    return halls;
  }, { timeout: 15000 });
  console.table(result);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
