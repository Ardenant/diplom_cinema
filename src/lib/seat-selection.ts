export type CinemaSeat = {
  id: string;
  row: number;
  number: number;
  occupied: boolean;
};

/** Explicit aisle boundaries are shared by the map, recommendation and 3D view. */
export function getAislesAfter(
  seatsPerRow: number,
  boundaries: readonly number[] = [],
): number[] {
  return [...new Set(boundaries)]
    .filter((number) =>
      Number.isInteger(number) && number > 0 && number < seatsPerRow,
    )
    .sort((a, b) => a - b);
}

export function getSeatPosition(
  number: number,
  seatsPerRow: number,
  boundaries: readonly number[] = [],
): number {
  const aisles = getAislesAfter(seatsPerRow, boundaries);
  const crossed = aisles.filter((aisle) => number > aisle).length;
  return (
    (number - (seatsPerRow + 1) / 2) * 0.88 +
    (crossed - aisles.length / 2) * 0.84
  );
}

/** Prefer the middle of a row, approximately two thirds of the way into a hall. */
export function findAdjacentSeats(
  seats: CinemaSeat[],
  count: number,
  rowsCount: number,
  seatsPerRow: number,
  boundaries: readonly number[] = [],
): CinemaSeat[] {
  if (!Number.isInteger(count) || count < 1 || count > seatsPerRow) return [];

  const aisles = getAislesAfter(seatsPerRow, boundaries);
  const preferredRow = 1 + (Math.max(1, rowsCount) - 1) * 0.6;
  const byRow = new Map<number, CinemaSeat[]>();
  for (const seat of seats) {
    if (seat.occupied) continue;
    const row = byRow.get(seat.row) ?? [];
    row.push(seat);
    byRow.set(seat.row, row);
  }

  let best: CinemaSeat[] = [];
  let bestScore = Infinity;
  for (const [rowNumber, row] of [...byRow.entries()].sort(
    ([a], [b]) => a - b,
  )) {
    row.sort((a, b) => a.number - b.number);
    for (let start = 0; start <= row.length - count; start++) {
      const group = row.slice(start, start + count);
      if (group.some((seat, index) => seat.number !== group[0].number + index))
        continue;
      if (
        aisles.some((aisle) =>
          group[0].number <= aisle && group[count - 1].number > aisle,
        )
      )
        continue;

      const center = (
        getSeatPosition(group[0].number, seatsPerRow, aisles) +
        getSeatPosition(group[count - 1].number, seatsPerRow, aisles)
      ) / 2;
      const score =
        (Math.abs(rowNumber - preferredRow) / Math.max(rowsCount, 1)) * 2 +
        Math.abs(center) / Math.max(seatsPerRow * 0.88, 1);
      if (score < bestScore) {
        best = group;
        bestScore = score;
      }
    }
  }
  return best;
}
