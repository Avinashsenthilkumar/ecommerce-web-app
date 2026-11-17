import { expect, test } from "@playwright/test";
import { includeRating } from "../../src/lib/services/reviews";

test("a new review preserves the seeded aggregate rating baseline", () => {
  const updated = includeRating(4.7, 1284, 1);
  expect(updated.ratingCount).toBe(1285);
  expect(updated.ratingAvg).toBe(4.7);
});
