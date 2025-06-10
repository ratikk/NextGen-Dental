export const HERO_IMAGES = {
  dental1: '/images/hero/dental-1.jpg',
  dental2: '/images/hero/dental-2.jpg',
  dental3: '/images/hero/dental-3.jpg'
} as const;

export const BRAND_IMAGES = {
  logo: '/images/logo.png'
} as const;

export type HeroImage = keyof typeof HERO_IMAGES;
export type BrandImage = keyof typeof BRAND_IMAGES;