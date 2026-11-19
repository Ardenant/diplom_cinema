import assert from "node:assert/strict";
import test from "node:test";

import {
  findAdjacentSeats,
  getAislesAfter,
  getSeatPosition,
  type CinemaSeat,
} from "./seat-selection";

function hall(rows = 10, numbers = 12): CinemaSeat[] {
  return Array.from({ length: rows * numbers }, (_, index) => ({
    id: `seat-${index}`,
    row: Math.floor(index / numbers) + 1,
    number: (index % numbers) + 1,
    occupied: false,
  }));
}

test("picks a centered pair in the middle-to-back part of the hall", () => {
  const result = findAdjacentSeats(hall(), 2, 10, 12, [6]);
  assert.deepEqual(
    result.map((s) => [s.row, s.number]),
    [
      [6, 5],
      [6, 6],
    ],
  );
});

test("never joins seats across the central aisle", () => {
  const seats = hall(1).filter((s) => s.number === 6 || s.number === 7);
  assert.equal(findAdjacentSeats(seats, 2, 1, 12, [6]).length, 0);
});

test("does not bridge occupied seats or missing coordinates", () => {
  const seats = hall(1, 8).filter((s) => [2, 3, 5, 7, 8].includes(s.number));
  seats.find((s) => s.number === 3)!.occupied = true;
  assert.deepEqual(
    findAdjacentSeats(seats, 2, 1, 8).map((s) => s.number),
    [7, 8],
  );
});

test("does not combine different rows into one group", () => {
  const seats = hall(2, 8).filter((s) => s.number === 4);
  assert.deepEqual(findAdjacentSeats(seats, 2, 2, 8), []);
});

test("finds a full section in an odd-width hall", () => {
  const result = findAdjacentSeats(hall(2, 11), 6, 2, 11, [5]);
  assert.equal(new Set(result.map((s) => s.row)).size, 1);
  assert.deepEqual(
    result.map((s) => s.number),
    [6, 7, 8, 9, 10, 11],
  );
});

test("returns no recommendation when sold out or a group is too large", () => {
  const seats = hall(2, 8).map((s) => ({ ...s, occupied: true }));
  assert.deepEqual(findAdjacentSeats(seats, 1, 2, 8), []);
  for (const count of [-1, 0, 1.5, 9])
    assert.deepEqual(findAdjacentSeats(hall(2, 8), count, 2, 8), []);
});

test("is deterministic and does not mutate the supplied seat order", () => {
  const seats = hall().reverse();
  const before = seats.map((s) => s.id);
  assert.deepEqual(
    findAdjacentSeats(seats, 3, 10, 12, [6]),
    findAdjacentSeats([...seats].reverse(), 3, 10, 12, [6]),
  );
  assert.deepEqual(
    seats.map((s) => s.id),
    before,
  );
});

test("the map and perspective share a symmetric aisle position", () => {
  assert.deepEqual(getAislesAfter(8), []);
  assert.deepEqual(getAislesAfter(12, [6]), [6]);
  assert.equal(getSeatPosition(1, 12, [6]), -getSeatPosition(12, 12, [6]));
  assert.ok(getSeatPosition(7, 12, [6]) - getSeatPosition(6, 12, [6]) > 1.5);
  assert.ok(
    Math.abs(getSeatPosition(3, 12, [6]) - getSeatPosition(2, 12, [6]) - 0.88) < 1e-9,
  );
});

function referenceHall() {
  return hall(11, 21).filter((seat) => seat.row >= 7 || seat.number <= 18);
}

test("keeps the central fifteen seats together between the two side aisles", () => {
  const result = findAdjacentSeats(referenceHall(), 15, 11, 21, [3, 18]);
  assert.equal(new Set(result.map((seat) => seat.row)).size, 1);
  assert.deepEqual(result.map((seat) => seat.number), Array.from({ length: 15 }, (_, index) => index + 4));
  assert.deepEqual(findAdjacentSeats(referenceHall(), 16, 11, 21, [3, 18]), []);
  for (const boundary of [3, 18]) {
    const pair = referenceHall().filter((seat) => seat.row === 7 && [boundary, boundary + 1].includes(seat.number));
    assert.deepEqual(findAdjacentSeats(pair, 2, 11, 21, [3, 18]), []);
  }
});

test("the reference plan is centred on the central block without a middle aisle", () => {
  assert.deepEqual(getAislesAfter(21, [18, 3, 3, 0, 21, 2.5]), [3, 18]);
  assert.equal(getSeatPosition(11, 21, [3, 18]), 0);
  assert.equal(getSeatPosition(1, 21, [3, 18]), -getSeatPosition(21, 21, [3, 18]));
  assert.ok(Math.abs(getSeatPosition(11, 21, [3, 18]) - getSeatPosition(10, 21, [3, 18]) - 0.88) < 1e-9);
  for (const boundary of [3, 18]) {
    assert.ok(getSeatPosition(boundary + 1, 21, [3, 18]) - getSeatPosition(boundary, 21, [3, 18]) > 1.5);
  }
});
