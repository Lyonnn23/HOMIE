import { expect, test } from "bun:test";
import { destacaPremium } from "../src/lib/premium-ranking";

test("Premium needs at least a 4.0 rating", () => {
  expect(destacaPremium({ premium: true, rating: 3.9, reviewsCount: 3 })).toBe(false);
  expect(destacaPremium({ premium: true, rating: 4, reviewsCount: 3 })).toBe(true);
});

test("Premium needs at least three reviews", () => {
  expect(destacaPremium({ premium: true, rating: 4, reviewsCount: 2 })).toBe(false);
  expect(destacaPremium({ premium: true, rating: 4, reviewsCount: 3 })).toBe(true);
});

test("an inactive membership gets no ranking benefit", () => {
  expect(destacaPremium({ premium: false, rating: 5, reviewsCount: 10 })).toBe(false);
});

test("administrator thresholds replace the defaults", () => {
  const profile = { premium: true, rating: 4, reviewsCount: 3 };
  expect(destacaPremium(profile, { rating: 4.5, reviews: 3 })).toBe(false);
  expect(destacaPremium(profile, { rating: 4, reviews: 4 })).toBe(false);
  expect(destacaPremium(profile, { rating: 4, reviews: 3 })).toBe(true);
});