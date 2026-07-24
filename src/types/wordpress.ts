/**
 * Typed shapes for the headless WordPress content layer.
 *
 * These mirror what the WP REST API + Advanced Custom Fields (ACF) would
 * return for this site's custom post types / options pages. Components only
 * ever import from `src/services/wordpress/*`, never these seed files, so
 * pointing `WORDPRESS_API_URL` at a real WP instance later is a data-layer
 * change only — no component changes required.
 */

export interface WPImage {
  url: string;
  alt: string;
  width?: number;
  height?: number;
}

export interface WPLink {
  label: string;
  href: string;
}

export type BadgeTier = 'platinum' | 'gold' | 'silver' | 'bronze' | 'emerging';

export interface SiteSettings {
  siteName: string;
  tagline: string;
  logo: { light: WPImage; dark: WPImage; mark: WPImage };
  primaryNav: WPLink[];
  ctaNav: { signIn: WPLink; register: WPLink };
  footer: {
    blurb: string;
    sitemap: WPLink[];
    contact: { email: string; phone: string; address: string };
    parentCompany: { label: string; name: string; logo: WPImage };
    copyright: string;
  };
  stats: { value: string; label: string }[];
}

export interface Property {
  id: string;
  slug: string;
  title: string;
  city: string;
  state: string;
  acreage: number;
  image: WPImage;
  featured: boolean;
  tier?: BadgeTier;
}

export interface TeamMember {
  id: string;
  name: string;
  jobTitle: string;
  photo: WPImage;
  order: number;
}

export interface Testimonial {
  id: string;
  quote: string;
  personName: string;
  personTitle: string;
  companyName: string;
  companyLogo: WPImage;
  backgroundImage: WPImage;
}

export interface Partner {
  id: string;
  name: string;
  url: string;
  image: WPImage;
  eyebrow?: string;
  headline?: string;
  variant: 'photo' | 'wordmark';
}

export interface ScoreTier {
  id: string;
  tier: BadgeTier;
  label: string;
  range: string;
  badgeImage: WPImage;
  description: string;
}

export interface ScoringCriterion {
  id: string;
  label: string;
  weightPercent: number;
  color: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  contentHtml: string;
  date: string; // ISO 8601
  author: { name: string };
  tags: string[];
  featuredImage: WPImage;
  /** Wider crop shown at the top of the article page; falls back to featuredImage. */
  heroImage?: WPImage;
}

export interface LegalSection {
  id: string;
  eyebrow: string;
  heading: string;
  bodyHtml: string;
}

export interface AdvantageItem {
  id: string;
  icon: 'map-pin' | 'trending-up' | 'shield-check';
  title: string;
  description: string;
}

export interface ScoringCriteria {
  primaryCriteria: string[];
  eligibility: string[];
}
