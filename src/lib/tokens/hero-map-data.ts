/**
 * Content for the home hero's interactive map (HeroMap.tsx).
 *
 * Positions are percent of the map's width/height, geographically accurate —
 * each marker is projected from its real city's lat/lon (via a `geoAlbers`
 * projection fitted to this card's exact aspect ratio) so the pins land
 * correctly on the real coastline in HeroMap.tsx. See that file's header
 * comment for how the projection/path were generated.
 * Counts mirror the regional groupings shown in the original static hero
 * graphic (design-assets/landing page/hero image of map.png), recast as
 * named market regions instead of an un-labeled third-party map export.
 */
export interface HeroMapMarker {
  id: string;
  /** Region label shown in the marker tooltip. */
  label: string;
  /** Site count shown in the marker tooltip, e.g. "196" or "200+". */
  count: string;
  /** Percent of map width, 0–100. */
  x: number;
  /** Percent of map height, 0–100. */
  y: number;
}

export const HERO_MAP_MARKERS: HeroMapMarker[] = [
  // y nudged down from the raw Seattle projection (5.6) so the larger count
  // bubble clears the "nationwide coverage" badge in the map's top-left corner.
  { id: 'pacific-nw', label: 'Pacific Northwest', count: '106', x: 14, y: 22 },
  { id: 'bay-area', label: 'Bay Area', count: '196', x: 6.5, y: 41.9 },
  { id: 'socal', label: 'Southern California', count: '200+', x: 11.2, y: 59 },
  { id: 'mountain-west', label: 'Mountain West', count: '200+', x: 36, y: 44 },
  { id: 'south-central', label: 'South Central', count: '200+', x: 49.5, y: 72.1 },
  { id: 'gulf-coast', label: 'Gulf Coast', count: '200+', x: 52.2, y: 83.7 },
  { id: 'great-lakes', label: 'Great Lakes', count: '200+', x: 64.6, y: 35.9 },
  { id: 'southeast', label: 'Southeast', count: '200+', x: 67.2, y: 57.7 },
  { id: 'florida', label: 'Florida', count: '87', x: 82.4, y: 90 },
  { id: 'mid-atlantic', label: 'Mid-Atlantic', count: '129', x: 82.9, y: 42.9 },
  { id: 'northeast', label: 'Northeast', count: '103', x: 90.7, y: 26 },
];

/**
 * Draw order for the animated coverage route — a single open path visiting
 * every marker once, kept roughly west-to-east to minimize crossings.
 */
export const HERO_MAP_ROUTE: string[] = [
  'bay-area',
  'pacific-nw',
  'mountain-west',
  'great-lakes',
  'northeast',
  'mid-atlantic',
  'southeast',
  'florida',
  'gulf-coast',
  'south-central',
  'socal',
];

export const HERO_MAP_SUMMARY = `${HERO_MAP_MARKERS.length} regions · nationwide coverage`;

/**
 * Small decorative Canada bubbles (matching the Figma reference) — plain map
 * texture, not REDI's own tracked regions, so they're kept out of
 * HERO_MAP_MARKERS/HERO_MAP_ROUTE entirely: the "11 regions" badge stays
 * accurate and the coverage network never draws a connection to them.
 * y is nudged a few points off the raw projection so each bubble's full
 * circle clears the frame's top edge instead of clipping.
 */
export const HERO_CONTEXT_MARKERS: HeroMapMarker[] = [
  // y nudged down so the bubble clears the "nationwide coverage" badge, same
  // reasoning as the pacific-nw nudge above.
  { id: 'calgary', label: 'Calgary', count: '8', x: 25.64, y: 17 },
  { id: 'winnipeg', label: 'Winnipeg', count: '5', x: 49.35, y: 8 },
  // x/y nudged in from the raw projection so the bubble clears the card's
  // rounded top-right corner instead of clipping against it.
  { id: 'halifax', label: 'Halifax', count: '3', x: 87, y: 15 },
];
