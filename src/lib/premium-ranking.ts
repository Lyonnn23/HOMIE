export type UmbralesPremium = { rating: number; reviews: number };

export const UMBRALES_PREMIUM: UmbralesPremium = { rating: 4, reviews: 3 };

export function destacaPremium(r: { premium: boolean; rating: number; reviewsCount: number }, umbrales = UMBRALES_PREMIUM) {
  return r.premium && r.rating >= umbrales.rating && r.reviewsCount >= umbrales.reviews;
}