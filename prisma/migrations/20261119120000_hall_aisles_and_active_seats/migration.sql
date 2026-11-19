-- Persist physical aisle boundaries and retain historical seats when a hall changes.
ALTER TABLE "Hall" ADD COLUMN "aislesAfter" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];
ALTER TABLE "Seat" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
