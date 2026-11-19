import type { PrismaClient } from "../src/generated/prisma/client";

const referenceLayout = {
  rowsCount: 11,
  seatsPerRow: 21,
  aislesAfter: [3, 18],
  rowSeatCounts: [18, 18, 18, 18, 18, 18, 21, 21, 21, 21, 21],
};

export const HALL_LAYOUTS = [
  {
    name: "Красный зал",
    format: "STANDARD_2D" as const,
    ...referenceLayout,
  },
  {
    name: "Синий зал",
    format: "FORMAT_3D" as const,
    ...referenceLayout,
  },
  {
    name: "VIP-зал",
    format: "VIP" as const,
    ...referenceLayout,
  },
];

/** Keep existing seat IDs and tickets; archive positions outside the new plan. */
export async function ensureHallLayout(
  database: Pick<PrismaClient, "hall" | "seat">,
  layout: (typeof HALL_LAYOUTS)[number],
) {
  const { rowSeatCounts, ...metadata } = layout;
  if (
    rowSeatCounts.length !== layout.rowsCount ||
    rowSeatCounts.some((count) =>
      !Number.isInteger(count) || count < 0 || count > layout.seatsPerRow,
    )
  ) {
    throw new Error(`Invalid row layout: ${layout.name}`);
  }

  const hall = await database.hall.upsert({
    where: { name: layout.name },
    create: metadata,
    update: metadata,
  });
  const existing = await database.seat.findMany({ where: { hallId: hall.id } });
  const coordinates = rowSeatCounts.flatMap((count, row) =>
    Array.from({ length: count }, (_, number) => ({
      hallId: hall.id,
      row: row + 1,
      number: number + 1,
    })),
  );
  const desired = new Set(coordinates.map((seat) => `${seat.row}:${seat.number}`));
  const archived = existing.filter((seat) =>
    seat.isActive && !desired.has(`${seat.row}:${seat.number}`),
  );
  const restored = existing.filter((seat) =>
    !seat.isActive && desired.has(`${seat.row}:${seat.number}`),
  );
  if (archived.length) {
    await database.seat.updateMany({
      where: { id: { in: archived.map((seat) => seat.id) } },
      data: { isActive: false },
    });
  }
  if (restored.length) {
    await database.seat.updateMany({
      where: { id: { in: restored.map((seat) => seat.id) } },
      data: { isActive: true },
    });
  }
  const added = await database.seat.createMany({
    data: coordinates,
    skipDuplicates: true,
  });
  return {
    hall,
    added: added.count,
    archived: archived.length,
    restored: restored.length,
    capacity: coordinates.length,
  };
}
