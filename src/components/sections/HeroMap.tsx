import { useEffect, useId, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import { MapPin, Minus, Plus, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  HERO_MAP_MARKERS,
  HERO_MAP_ROUTE,
  HERO_MAP_SUMMARY,
  type HeroMapMarker,
} from '@/lib/tokens/hero-map-data';
import {
  CITY_DOTS,
  HIGHWAY_CORRIDORS,
  LAND_PATH_D,
  MAP_VIEWBOX_WIDTH,
  STATE_BOUNDARIES,
  STATE_LABELS,
} from '@/lib/tokens/hero-map-geo';

/** Premium ease-out-expo — used for reveals/entrances. */
const EASE_SOFT = [0.16, 1, 0.3, 1] as const;
/** Snappier ease — used for interactive hover/select feedback. */
const EASE_OUT = [0.25, 0.46, 0.45, 0.94] as const;
const SPRING_SNAPPY = { type: 'spring', stiffness: 260, damping: 30 } as const;
const SPRING_GLIDE = { type: 'spring', stiffness: 120, damping: 20, mass: 0.6 } as const;

const ZOOM_LEVELS = [1, 1.6, 2.2] as const;
const FOCUS_ZOOM_INDEX = 1;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

/**
 * `MAP_VIEWBOX_WIDTH` (see hero-map-geo.ts) matches this card's exact aspect
 * ratio for a 100-tall viewBox — every map layer below shares this viewBox
 * (no `preserveAspectRatio="none"` stretch needed) so the coastline, state
 * borders, and highways all render undistorted and geographically correct.
 */
const MAP_VIEWBOX = `0 0 ${MAP_VIEWBOX_WIDTH} 100`;

/** Position within the route — used to sequence the cinematic entrance geographically. */
const ROUTE_INDEX: Record<string, number> = Object.fromEntries(
  HERO_MAP_ROUTE.map((id, i) => [id, i]),
);

/** Immediate route neighbors of each marker, for "highlight connected regions" on focus. */
const ROUTE_NEIGHBORS: Record<string, string[]> = Object.fromEntries(
  HERO_MAP_ROUTE.map((id, i) => [
    id,
    [HERO_MAP_ROUTE[i - 1], HERO_MAP_ROUTE[i + 1]].filter((v): v is string => Boolean(v)),
  ]),
);

interface RouteSegment {
  id: string;
  from: string;
  to: string;
  d: string;
}

/**
 * One gently-bowed curve per consecutive pair in the route, so each edge can be
 * styled/animated independently. Coordinates are converted from marker percent
 * (0–100) into the same undistorted MAP_VIEWBOX_WIDTH-tall units as the terrain
 * layer, so the bow offset (a true perpendicular) isn't skewed by any x/y scale
 * mismatch.
 */
function buildRouteSegments(ids: string[]): RouteSegment[] {
  const points = ids.map((id) => {
    const marker = HERO_MAP_MARKERS.find((m) => m.id === id)!;
    return { id, x: (marker.x / 100) * MAP_VIEWBOX_WIDTH, y: marker.y };
  });
  const segments: RouteSegment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const bow = (i % 2 === 0 ? 1 : -1) * len * 0.09;
    const mx = (a.x + b.x) / 2 + (-dy / len) * bow;
    const my = (a.y + b.y) / 2 + (dx / len) * bow;
    const d = `M${a.x.toFixed(2)},${a.y.toFixed(2)} Q${mx.toFixed(2)},${my.toFixed(2)} ${b.x.toFixed(2)},${b.y.toFixed(2)}`;
    segments.push({ id: `${a.id}__${b.id}`, from: a.id, to: b.id, d });
  }
  return segments;
}

const ROUTE_SEGMENTS = buildRouteSegments(HERO_MAP_ROUTE);

/** Deterministic (SSR-safe — no Math.random) drift positions for the ambient background particles. */
// Rounded to 2dp: transcendental Math.cos/Math.sin aren't guaranteed bit-identical
// across engine versions (server Node vs. client browser), so the raw floats can
// differ in their last bits — enough to produce a different `toString()` and trip
// a hydration mismatch. Rounding gives both environments the same stable string.
const AMBIENT_PARTICLES = Array.from({ length: 9 }, (_, i) => {
  const angle = (i / 9) * Math.PI * 2;
  return {
    id: `ambient-${i}`,
    x: Math.round((50 + Math.cos(angle * 1.9 + i) * 40) * 100) / 100,
    y: Math.round((50 + Math.sin(angle * 1.4 + i * 0.7) * 38) * 100) / 100,
    delay: (i * 0.7) % 4,
    duration: 7 + (i % 4) * 1.5,
  };
});

/** Entrance timeline constants — the reveal follows the route order, so the map builds itself in geographically. */
const ENTRANCE = {
  terrainDuration: 0.7,
  routeStart: 0.35,
  segmentStagger: 0.09,
  segmentDuration: 0.5,
  markerLead: 0.22,
};

function markerEntranceDelay(markerId: string): number {
  const routeIdx = ROUTE_INDEX[markerId] ?? 0;
  return ENTRANCE.routeStart + routeIdx * ENTRANCE.segmentStagger + ENTRANCE.markerLead;
}

type Emphasis = 'focal' | 'neighbor' | 'dimmed' | 'neutral';

interface MarkerPinProps {
  marker: HeroMapMarker;
  isActive: boolean;
  isHovered: boolean;
  emphasis: Emphasis;
  reduceMotion: boolean;
  entranceDone: boolean;
  mapScale: MotionValue<number>;
  onHover: (id: string | null) => void;
  onSelect: (marker: HeroMapMarker) => void;
}

function HeroMapMarkerPin({
  marker,
  isActive,
  isHovered,
  emphasis,
  reduceMotion,
  entranceDone,
  mapScale,
  onHover,
  onSelect,
}: MarkerPinProps) {
  // Counter-scale so pins stay a constant screen size while zooming, like a real map UI overlay.
  const inverseScale = useTransform(mapScale, (s) => 1 / s);
  const showTooltip = isActive || isHovered;
  const placeAbove = marker.y > 24;
  const align: 'start' | 'center' | 'end' =
    marker.x < 20 ? 'start' : marker.x > 80 ? 'end' : 'center';

  const entranceDelay = markerEntranceDelay(marker.id);
  const delay = entranceDone ? 0 : entranceDelay;
  const dimmedOpacity = emphasis === 'dimmed' ? 0.4 : 1;
  const emphasisScale = emphasis === 'focal' ? 1.08 : 1;

  return (
    <div className="absolute" style={{ left: `${marker.x}%`, top: `${marker.y}%` }}>
      <motion.div
        style={{ scale: inverseScale }}
        className="relative -translate-x-1/2 -translate-y-1/2"
        initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.6 }}
        animate={{ opacity: dimmedOpacity, y: 0, scale: emphasisScale }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : {
                opacity: { duration: entranceDone ? 0.25 : 0.55, delay },
                y: { duration: 0.55, delay, ease: EASE_SOFT },
                scale: { duration: entranceDone ? 0.25 : 0.55, delay, ease: EASE_OUT },
              }
        }
      >
        {/* contact shadow — grows on hover/active to simulate the pin lifting */}
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute top-[22px] left-1/2 h-1.5 w-4 -translate-x-1/2 rounded-full bg-black/50 blur-[2px]"
          animate={{ opacity: showTooltip ? 0.5 : 0.22, scaleX: showTooltip ? 1.15 : 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.25 }}
        />

        <motion.div
          animate={reduceMotion || !entranceDone ? undefined : { y: [0, -3, 0] }}
          transition={
            reduceMotion || !entranceDone
              ? undefined
              : {
                  duration: 4 + ((ROUTE_INDEX[marker.id] ?? 0) % 3),
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: (ROUTE_INDEX[marker.id] ?? 0) * 0.25,
                }
          }
          className="relative flex items-center justify-center"
        >
          {!reduceMotion && entranceDone && (
            <>
              <motion.span
                aria-hidden="true"
                className="pointer-events-none absolute h-6 w-6 rounded-full border border-cyan-300/70"
                initial={{ opacity: 0.55, scale: 0.7 }}
                animate={{ opacity: 0, scale: 2.4 }}
                transition={{
                  duration: 2.6,
                  ease: 'easeOut',
                  repeat: Infinity,
                  delay: ((ROUTE_INDEX[marker.id] ?? 0) % 5) * 0.4,
                }}
              />
              <motion.span
                aria-hidden="true"
                className="pointer-events-none absolute h-6 w-6 rounded-full border border-cyan-200/50"
                initial={{ opacity: 0.4, scale: 0.7 }}
                animate={{ opacity: 0, scale: 3.1 }}
                transition={{
                  duration: 3.2,
                  ease: 'easeOut',
                  repeat: Infinity,
                  delay: ((ROUTE_INDEX[marker.id] ?? 0) % 5) * 0.4 + 1,
                }}
              />
            </>
          )}

          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute h-8 w-8 rounded-full bg-cyan-400 blur-md"
            animate={{
              opacity:
                showTooltip || emphasis === 'focal' ? 0.6 : emphasis === 'neighbor' ? 0.35 : 0.2,
            }}
            transition={{ duration: reduceMotion ? 0 : 0.25 }}
          />

          <motion.button
            type="button"
            aria-label={`${marker.label}: ${marker.count} sites`}
            aria-expanded={showTooltip}
            aria-pressed={isActive}
            onMouseEnter={() => onHover(marker.id)}
            onMouseLeave={() => onHover(null)}
            onFocus={() => onHover(marker.id)}
            onBlur={() => onHover(null)}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(marker);
            }}
            animate={{ scale: showTooltip ? 1.25 : 1 }}
            transition={{ duration: reduceMotion ? 0 : 0.22, ease: EASE_OUT }}
            className={cn(
              'relative grid h-6 w-6 place-items-center rounded-full border-2 shadow-[0_0_0_3px_rgba(6,24,47,0.55)]',
              isActive
                ? 'border-cyan-200 bg-cyan-400'
                : 'border-white/70 bg-gradient-to-br from-cyan-300 to-cyan-600',
            )}
          >
            <span className="bg-navy-950/70 h-1.5 w-1.5 rounded-full" />
          </motion.button>

          <AnimatePresence>
            {showTooltip && (
              <motion.div
                role="status"
                initial={{ opacity: 0, y: placeAbove ? 6 : -6, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: placeAbove ? 6 : -6, scale: 0.94 }}
                transition={{ duration: 0.16, ease: EASE_OUT }}
                className={cn(
                  'shadow-lifted bg-navy-950/95 pointer-events-none absolute z-20 rounded-lg border border-white/15 px-3 py-1.5 whitespace-nowrap backdrop-blur-sm',
                  placeAbove ? 'bottom-[calc(100%+10px)]' : 'top-[calc(100%+10px)]',
                  align === 'start' && 'left-0',
                  align === 'end' && 'right-0',
                  align === 'center' && 'left-1/2 -translate-x-1/2',
                )}
              >
                <p className="font-heading text-sm font-bold tracking-wide text-cyan-300">
                  {marker.count}{' '}
                  <span className="text-[10px] font-medium tracking-wider text-white/70 uppercase">
                    Sites
                  </span>
                </p>
                <p className="mt-0.5 text-xs font-medium text-white/80">{marker.label}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </div>
  );
}

interface RouteSegmentViewProps {
  segment: RouteSegment;
  index: number;
  isFocal: boolean;
  isDimmed: boolean;
  reduceMotion: boolean;
  entranceDone: boolean;
  onEntranceComplete?: () => void;
}

function RouteSegmentView({
  segment,
  index,
  isFocal,
  isDimmed,
  reduceMotion,
  entranceDone,
  onEntranceComplete,
}: RouteSegmentViewProps) {
  const delay = entranceDone ? 0 : ENTRANCE.routeStart + index * ENTRANCE.segmentStagger;
  const targetOpacity = isFocal ? 0.95 : isDimmed ? 0.12 : 0.45;

  return (
    <>
      <motion.path
        d={segment.d}
        fill="none"
        strokeLinecap="round"
        strokeDasharray="2.4 2.2"
        vectorEffect="non-scaling-stroke"
        initial={
          reduceMotion ? false : { pathLength: 0, opacity: 0, stroke: '#73d4ee', strokeWidth: 0.5 }
        }
        animate={{
          pathLength: 1,
          opacity: targetOpacity,
          stroke: isFocal ? '#bae5f1' : '#73d4ee',
          strokeWidth: isFocal ? 0.7 : 0.5,
        }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : {
                pathLength: { duration: ENTRANCE.segmentDuration, delay, ease: EASE_SOFT },
                opacity: { duration: entranceDone ? 0.3 : ENTRANCE.segmentDuration, delay },
                stroke: { duration: 0.25 },
                strokeWidth: { duration: 0.25 },
              }
        }
        onAnimationComplete={index === ROUTE_SEGMENTS.length - 1 ? onEntranceComplete : undefined}
      />
      {!reduceMotion && entranceDone && (
        <circle
          r={isFocal ? 0.8 : 0.55}
          fill={isFocal ? '#e3f6fc' : '#bae5f1'}
          opacity={isFocal ? 0.9 : 0.5}
        >
          <animateMotion
            dur={`${isFocal ? 2.4 : 3.6}s`}
            repeatCount="indefinite"
            path={segment.d}
            rotate="auto"
          />
        </circle>
      )}
    </>
  );
}

/**
 * The home hero's map: a depth-layered, brand-colored coverage visualization —
 * animated network routes with traveling particles, hoverable/keyboard-focusable
 * region pins that highlight their connected neighbors, a cinematic build-in
 * sequence, cursor parallax split across background/terrain/network/marker
 * layers (fine-pointer only), and pinch/button zoom + drag-to-pan with a
 * smooth camera focus when a region is selected. All motion runs on
 * transform/opacity only and is skipped under prefers-reduced-motion.
 */
export default function HeroMap() {
  // `useReducedMotion` reads the OS preference synchronously on the client, but the
  // server always renders assuming motion is enabled (it has no such preference to
  // read). Gating the real value behind a post-mount flag keeps the client's first
  // render identical to the server's, then upgrades to the true value one tick later
  // — avoiding a hydration mismatch for users with reduced motion turned on.
  const systemReducedMotion = useReducedMotion();
  const [isMounted, setIsMounted] = useState(false);
  const reduceMotion = isMounted && Boolean(systemReducedMotion);
  const mapId = useId();
  const outerRef = useRef<HTMLDivElement>(null);

  const [isFinePointer, setIsFinePointer] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [zoomIndex, setZoomIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [entranceDone, setEntranceDone] = useState(false);

  const scale = useMotionValue(1);
  const panX = useMotionValue(0);
  const panY = useMotionValue(0);

  // Whole-card tilt (a light "glass" response) plus independent per-layer
  // translate parallax, so background/terrain/network/markers each drift by
  // a different amount — a real sense of depth rather than one rigid plane.
  const rawTiltX = useMotionValue(0);
  const rawTiltY = useMotionValue(0);
  const tiltX = useSpring(rawTiltX, { stiffness: 150, damping: 18, mass: 0.4 });
  const tiltY = useSpring(rawTiltY, { stiffness: 150, damping: 18, mass: 0.4 });

  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothPointerX = useSpring(pointerX, { stiffness: 120, damping: 22, mass: 0.5 });
  const smoothPointerY = useSpring(pointerY, { stiffness: 120, damping: 22, mass: 0.5 });

  const backgroundX = useTransform(smoothPointerX, (v) => v * 3);
  const backgroundY = useTransform(smoothPointerY, (v) => v * 3);
  const terrainX = useTransform(smoothPointerX, (v) => v * 7);
  const terrainY = useTransform(smoothPointerY, (v) => v * 7);
  const networkX = useTransform(smoothPointerX, (v) => v * 11);
  const networkY = useTransform(smoothPointerY, (v) => v * 11);
  const markersX = useTransform(smoothPointerX, (v) => v * 15);
  const markersY = useTransform(smoothPointerY, (v) => v * 15);

  const canPan = zoomIndex > 0;
  const focusId = hoveredId ?? activeId;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (reduceMotion) setEntranceDone(true);
  }, [reduceMotion]);

  // Parallax should only respond to a real mouse, never emulate on touch.
  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setIsFinePointer(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const target = ZOOM_LEVELS[zoomIndex];
    const opts = reduceMotion ? { duration: 0 } : SPRING_SNAPPY;
    const controls = animate(scale, target, opts);
    const resets = zoomIndex === 0 ? [animate(panX, 0, opts), animate(panY, 0, opts)] : [];
    return () => {
      controls.stop();
      resets.forEach((c) => c.stop());
    };
    // scale/panX/panY are stable MotionValue refs; only zoomIndex/reduceMotion should retrigger this.
  }, [zoomIndex, reduceMotion]);

  // Ctrl/pinch + wheel to zoom, without hijacking normal page scroll (only acts when ctrlKey is set,
  // which is how trackpads report a pinch gesture).
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    function onWheel(event: WheelEvent) {
      if (!event.ctrlKey) return;
      event.preventDefault();
      const next = clamp(
        scale.get() - event.deltaY * 0.01,
        ZOOM_LEVELS[0],
        ZOOM_LEVELS[ZOOM_LEVELS.length - 1],
      );
      scale.set(next);
      setZoomIndex(next > 1.9 ? 2 : next > 1.25 ? 1 : 0);
    }
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [scale]);

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!isFinePointer || reduceMotion) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const py = clamp((event.clientY - rect.top) / rect.height, 0, 1);
    const maxTilt = 3;
    rawTiltY.set((px - 0.5) * 2 * maxTilt);
    rawTiltX.set(-(py - 0.5) * 2 * maxTilt);
    pointerX.set(px - 0.5);
    pointerY.set(py - 0.5);
  }

  function handlePointerLeave() {
    rawTiltX.set(0);
    rawTiltY.set(0);
    pointerX.set(0);
    pointerY.set(0);
  }

  /** Glides pan/zoom so the chosen region settles toward the center of the card. */
  function focusOnMarker(marker: HeroMapMarker) {
    const el = outerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nextZoomIndex = zoomIndex === 0 ? FOCUS_ZOOM_INDEX : zoomIndex;
    const targetScale = ZOOM_LEVELS[nextZoomIndex];
    const maxPanX = (rect.width * (targetScale - 1)) / 2;
    const maxPanY = (rect.height * (targetScale - 1)) / 2;
    const targetPanX = clamp(-(marker.x / 100 - 0.5) * rect.width * targetScale, -maxPanX, maxPanX);
    const targetPanY = clamp(
      -(marker.y / 100 - 0.5) * rect.height * targetScale,
      -maxPanY,
      maxPanY,
    );

    if (nextZoomIndex !== zoomIndex) setZoomIndex(nextZoomIndex);
    const opts = reduceMotion ? { duration: 0 } : SPRING_GLIDE;
    animate(scale, targetScale, opts);
    animate(panX, targetPanX, opts);
    animate(panY, targetPanY, opts);
  }

  function handleSelect(marker: HeroMapMarker) {
    setActiveId((current) => {
      const next = current === marker.id ? null : marker.id;
      if (next) focusOnMarker(marker);
      return next;
    });
  }

  function cycleZoom() {
    setZoomIndex((i) => (i >= ZOOM_LEVELS.length - 1 ? 0 : i + 1));
  }

  return (
    <div
      ref={outerRef}
      role="group"
      aria-label="Interactive map of REDI Sites nationwide coverage"
      className="relative h-full w-full touch-pan-y overflow-hidden select-none"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <ul className="sr-only">
        {HERO_MAP_MARKERS.map((marker) => (
          <li key={marker.id}>
            {marker.label}: {marker.count} sites
          </li>
        ))}
      </ul>

      <div style={{ perspective: 900 }} className="h-full w-full">
        <motion.div
          style={{ rotateX: tiltX, rotateY: tiltY }}
          className="relative h-full w-full overflow-hidden"
        >
          <motion.div
            drag={canPan}
            dragConstraints={outerRef}
            dragElastic={0.06}
            dragMomentum={false}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={() => setIsDragging(false)}
            onDoubleClick={cycleZoom}
            style={{ x: panX, y: panY, scale }}
            className={cn(
              'absolute inset-0',
              canPan && (isDragging ? 'cursor-grabbing' : 'cursor-grab'),
            )}
          >
            {/* Layer 1: background — ocean gradient, dot texture, drifting grid, ambient glow, floating particles. */}
            <motion.div style={{ x: backgroundX, y: backgroundY }} className="absolute -inset-2">
              <svg
                aria-hidden="true"
                focusable="false"
                viewBox={MAP_VIEWBOX}
                className="absolute inset-0 h-full w-full"
              >
                <defs>
                  <radialGradient id={`${mapId}-ocean`} cx="35%" cy="28%">
                    <stop offset="0%" stopColor="#123152" />
                    <stop offset="100%" stopColor="#06182f" />
                  </radialGradient>
                  <pattern
                    id={`${mapId}-dots-sparse`}
                    width="4"
                    height="4"
                    patternUnits="userSpaceOnUse"
                  >
                    <circle cx="0.5" cy="0.5" r="0.35" fill="#2cc3ec" fillOpacity="0.14" />
                  </pattern>
                </defs>
                <rect
                  x="0"
                  y="0"
                  width={MAP_VIEWBOX_WIDTH}
                  height="100"
                  fill={`url(#${mapId}-ocean)`}
                />
                <rect
                  x="0"
                  y="0"
                  width={MAP_VIEWBOX_WIDTH}
                  height="100"
                  fill={`url(#${mapId}-dots-sparse)`}
                />
                <motion.g
                  stroke="#2cc3ec"
                  strokeOpacity="0.07"
                  strokeWidth="0.2"
                  vectorEffect="non-scaling-stroke"
                  animate={reduceMotion ? undefined : { x: [0, 4, 0], y: [0, 1.5, 0] }}
                  transition={
                    reduceMotion ? undefined : { duration: 14, repeat: Infinity, ease: 'easeInOut' }
                  }
                >
                  {[1, 2, 3, 4].map((i) => (
                    <line
                      key={`v${i}`}
                      x1={(i * MAP_VIEWBOX_WIDTH) / 5}
                      y1={0}
                      x2={(i * MAP_VIEWBOX_WIDTH) / 5}
                      y2={100}
                    />
                  ))}
                  {[20, 40, 60, 80].map((gy) => (
                    <line key={`h${gy}`} x1={0} y1={gy} x2={MAP_VIEWBOX_WIDTH} y2={gy} />
                  ))}
                </motion.g>

                <g
                  fill="#8fc5da"
                  fillOpacity="0.4"
                  fontSize="2.4"
                  fontWeight="600"
                  style={{ fontFamily: 'var(--font-body)', letterSpacing: '0.04em' }}
                  textAnchor="middle"
                >
                  <text x="4.5" y="58" transform="rotate(-90 4.5 58)">
                    PACIFIC OCEAN
                  </text>
                  <text x="170.5" y="62" transform="rotate(90 170.5 62)">
                    ATLANTIC OCEAN
                  </text>
                  <text x="98" y="97">
                    GULF OF MEXICO
                  </text>
                </g>
              </svg>

              <motion.div
                aria-hidden="true"
                className="absolute -top-8 -right-8 h-40 w-40 rounded-full bg-cyan-400/40 blur-3xl"
                animate={reduceMotion ? undefined : { opacity: [0.18, 0.34, 0.18] }}
                transition={
                  reduceMotion ? undefined : { duration: 9, repeat: Infinity, ease: 'easeInOut' }
                }
              />

              {!reduceMotion &&
                AMBIENT_PARTICLES.map((particle) => (
                  <motion.span
                    key={particle.id}
                    aria-hidden="true"
                    className="pointer-events-none absolute h-[3px] w-[3px] rounded-full bg-cyan-200"
                    style={{ left: `${particle.x}%`, top: `${particle.y}%` }}
                    animate={{
                      opacity: [0, 0.5, 0],
                      y: [0, -10, 0],
                    }}
                    transition={{
                      duration: particle.duration,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: particle.delay,
                    }}
                  />
                ))}
            </motion.div>

            {/* Layer 2: terrain — the stylized landmass. */}
            <motion.div style={{ x: terrainX, y: terrainY }} className="absolute inset-0">
              <svg
                aria-hidden="true"
                focusable="false"
                viewBox={MAP_VIEWBOX}
                className="absolute inset-0 h-full w-full"
              >
                <defs>
                  <pattern
                    id={`${mapId}-dots-dense`}
                    width="2.4"
                    height="2.4"
                    patternUnits="userSpaceOnUse"
                  >
                    <circle cx="0.4" cy="0.4" r="0.4" fill="#2cc3ec" fillOpacity="0.2" />
                  </pattern>
                </defs>
                <motion.g
                  initial={reduceMotion ? false : { opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { duration: ENTRANCE.terrainDuration, ease: EASE_SOFT }
                  }
                  style={{ transformOrigin: '50% 50%' }}
                >
                  <path d={LAND_PATH_D} fill="#20415c" />
                  <path d={LAND_PATH_D} fill={`url(#${mapId}-dots-dense)`} />

                  <g clipPath={`url(#${mapId}-land-clip)`}>
                    <clipPath id={`${mapId}-land-clip`}>
                      <path d={LAND_PATH_D} />
                    </clipPath>
                    {HIGHWAY_CORRIDORS.map((hwy) => (
                      <path
                        key={hwy.id}
                        d={`M${hwy.points.map((p) => `${p.x},${p.y}`).join(' L')}`}
                        fill="none"
                        stroke="#e8b93b"
                        strokeOpacity="0.32"
                        strokeWidth="0.22"
                        strokeDasharray="0.9 0.7"
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                      />
                    ))}
                    {STATE_BOUNDARIES.map((state) => (
                      <path
                        key={state.id}
                        d={state.d}
                        fill="none"
                        stroke="#8fb3cc"
                        strokeOpacity="0.22"
                        strokeWidth="0.15"
                        vectorEffect="non-scaling-stroke"
                      />
                    ))}
                    {CITY_DOTS.map((city) => (
                      <circle
                        key={city.name}
                        cx={city.x}
                        cy={city.y}
                        r="0.4"
                        fill="#eaf6fb"
                        fillOpacity="0.75"
                      />
                    ))}
                    {STATE_LABELS.map((state) => (
                      <text
                        key={state.id}
                        x={state.x}
                        y={state.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#d7ecf5"
                        fillOpacity="0.42"
                        fontSize="2.5"
                        fontWeight="600"
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        {state.name}
                      </text>
                    ))}
                  </g>

                  <path
                    d={LAND_PATH_D}
                    fill="none"
                    stroke="#2cc3ec"
                    strokeOpacity="0.4"
                    strokeWidth="0.6"
                    vectorEffect="non-scaling-stroke"
                  />
                  <text
                    x="93"
                    y="46"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#bae5f1"
                    fillOpacity="0.14"
                    fontSize="6.5"
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontWeight: 700,
                      letterSpacing: '0.09em',
                    }}
                  >
                    UNITED STATES
                  </text>
                </motion.g>
              </svg>
            </motion.div>

            {/* Layer 3: network — the coverage routes and their traveling particles. */}
            <motion.div style={{ x: networkX, y: networkY }} className="absolute inset-0">
              <svg
                aria-hidden="true"
                focusable="false"
                viewBox={MAP_VIEWBOX}
                className="absolute inset-0 h-full w-full"
              >
                {ROUTE_SEGMENTS.map((segment, index) => {
                  const isFocal = Boolean(
                    focusId && (segment.from === focusId || segment.to === focusId),
                  );
                  const isDimmed = Boolean(focusId) && !isFocal;
                  return (
                    <RouteSegmentView
                      key={segment.id}
                      segment={segment}
                      index={index}
                      isFocal={isFocal}
                      isDimmed={isDimmed}
                      reduceMotion={reduceMotion}
                      entranceDone={entranceDone}
                      onEntranceComplete={() => setEntranceDone(true)}
                    />
                  );
                })}
              </svg>
            </motion.div>

            {/* Layer 4: markers — the region pins. */}
            <motion.div style={{ x: markersX, y: markersY }} className="absolute inset-0">
              {HERO_MAP_MARKERS.map((marker) => {
                const isActive = activeId === marker.id;
                const isHovered = hoveredId === marker.id;
                const isFocal = focusId === marker.id;
                const isNeighbor = Boolean(
                  focusId && !isFocal && ROUTE_NEIGHBORS[focusId]?.includes(marker.id),
                );
                const emphasis: Emphasis = isFocal
                  ? 'focal'
                  : isNeighbor
                    ? 'neighbor'
                    : focusId
                      ? 'dimmed'
                      : 'neutral';
                return (
                  <HeroMapMarkerPin
                    key={marker.id}
                    marker={marker}
                    isActive={isActive}
                    isHovered={isHovered}
                    emphasis={emphasis}
                    reduceMotion={reduceMotion}
                    entranceDone={entranceDone}
                    mapScale={scale}
                    onHover={setHoveredId}
                    onSelect={handleSelect}
                  />
                );
              })}
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18),inset_0_0_40px_-16px_rgba(44,195,236,0.5)]" />

      <div className="rounded-pill bg-navy-950/50 font-heading pointer-events-none absolute top-4 left-4 inline-flex items-center gap-1.5 border border-white/20 px-3 py-1.5 text-[10px] font-medium tracking-wider text-white/85 uppercase backdrop-blur-sm">
        <MapPin className="h-3 w-3 text-cyan-400" aria-hidden="true" />
        {HERO_MAP_SUMMARY}
      </div>

      {/* Bottom-left: the Pacific/Mexico corner of a real US map, so these controls never sit over a region pin. */}
      <div className="bg-navy-950/60 absolute bottom-3 left-3 flex items-center gap-1 rounded-full border border-white/15 p-1 backdrop-blur-sm">
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => setZoomIndex((i) => Math.max(i - 1, 0))}
          disabled={zoomIndex === 0}
          className="grid h-7 w-7 place-items-center rounded-full text-white/85 transition-colors hover:bg-white/10 hover:text-cyan-300 disabled:pointer-events-none disabled:opacity-30"
        >
          <Minus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Reset map view"
          onClick={() => setZoomIndex(0)}
          disabled={zoomIndex === 0}
          className="grid h-7 w-7 place-items-center rounded-full text-white/85 transition-colors hover:bg-white/10 hover:text-cyan-300 disabled:pointer-events-none disabled:opacity-30"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => setZoomIndex((i) => Math.min(i + 1, ZOOM_LEVELS.length - 1))}
          disabled={zoomIndex === ZOOM_LEVELS.length - 1}
          className="grid h-7 w-7 place-items-center rounded-full text-white/85 transition-colors hover:bg-white/10 hover:text-cyan-300 disabled:pointer-events-none disabled:opacity-30"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
