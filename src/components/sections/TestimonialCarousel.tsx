import { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { Testimonial } from '@/types/wordpress';
import { heroSrcSet } from '@/utils/responsive-image';

interface Props {
  testimonials: Testimonial[];
}

/**
 * Three testimonials in view at a time on desktop, two on tablet, one on
 * phones.
 *
 * It used to show exactly one card and cross-fade between them, with the
 * section's background image swapping to match whichever card was showing.
 * Showing three at once makes a per-card background meaningless — there is no
 * single "active" testimonial any more — so the background is now fixed to the
 * first one and stays put while the row scrolls.
 *
 * How many fit is decided by CSS (the card's own width per breakpoint) rather
 * than by measuring the viewport in JS. That matters because this component is
 * server-rendered before it hydrates: a JS-derived count would have to guess a
 * value on the server and correct it on the client, which shows up as cards
 * visibly reflowing on load. Native scroll-snap also means the row still works
 * by swipe, trackpad and keyboard if the arrow buttons are never touched, and
 * degrades to a plain scrollable row if JS never runs at all.
 */
export default function TestimonialCarousel({ testimonials }: Props) {
  const scrollerRef = useRef<HTMLUListElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  // Disable an arrow once there is nothing further that way, so the controls
  // tell the truth instead of looking live at a dead end.
  const syncEdges = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setAtStart(el.scrollLeft <= 1);
    // `max <= 1` means every card already fits, so there is nothing to page.
    setAtEnd(max <= 1 || el.scrollLeft >= max - 1);
  }, []);

  useEffect(() => {
    syncEdges();
    const el = scrollerRef.current;
    if (!el) return;
    window.addEventListener('resize', syncEdges);
    return () => window.removeEventListener('resize', syncEdges);
  }, [syncEdges]);

  const page = useCallback(
    (dir: 1 | -1) => {
      const el = scrollerRef.current;
      if (!el) return;
      // Step by one card, measured from the real rendered card rather than a
      // hardcoded width, so it stays correct at every breakpoint.
      const card = el.querySelector('li');
      const gap = Number.parseFloat(getComputedStyle(el).columnGap || '0') || 0;
      const step = card ? card.getBoundingClientRect().width + gap : el.clientWidth;
      el.scrollBy({ left: dir * step, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    },
    [prefersReducedMotion],
  );

  // WordPress can legitimately return zero testimonials (all unpublished, or
  // none created yet) — wpFetch()'s seed fallback only kicks in on a failed
  // request, not a valid empty array, so this is a real, reachable state.
  // Render nothing rather than crash or show fake content; every page that
  // uses this component (home, about, approach) treats it as an optional
  // section, so an empty testimonials list simply means the section is
  // absent for this render.
  if (testimonials.length === 0) return null;

  // Safe: length is known non-zero by the guard above.
  const backdrop = testimonials[0]!.backgroundImage;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Client testimonials"
      className="bg-navy-900 relative isolate overflow-hidden"
    >
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <img
          src={backdrop.url}
          srcSet={heroSrcSet(backdrop.url)}
          sizes="100vw"
          alt=""
          className="size-full object-cover"
          loading="lazy"
          decoding="async"
        />
        <div className="from-navy-950/70 via-navy-800/45 to-navy-900/35 absolute inset-0 bg-gradient-to-r" />
      </div>

      <div className="container-page relative flex flex-col gap-8 py-16 sm:py-20">
        <ul
          ref={scrollerRef}
          onScroll={syncEdges}
          className="flex snap-x snap-mandatory [scrollbar-width:none] gap-6 overflow-x-auto overscroll-x-contain scroll-smooth pb-2 [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {testimonials.map((testimonial, index) => (
            <li
              key={testimonial.id}
              aria-roledescription="slide"
              aria-label={`Testimonial ${index + 1} of ${testimonials.length}: ${testimonial.companyName}`}
              className="w-[min(100%,360px)] shrink-0 snap-start sm:w-[calc((100%-1.5rem)/2)] lg:w-[calc((100%-3rem)/3)]"
            >
              <figure className="bg-steel-100 shadow-lifted flex h-full flex-col rounded-xl p-8">
                <img
                  src={testimonial.companyLogo.url}
                  alt={testimonial.companyLogo.alt}
                  width={440}
                  height={176}
                  className="h-24 w-auto object-contain"
                  loading="lazy"
                  decoding="async"
                />
                <figcaption className="font-heading text-ink-900 mt-5 text-lg font-bold tracking-normal uppercase">
                  {testimonial.companyName}
                </figcaption>
                <svg
                  viewBox="0 0 40 24"
                  className="fill-navy-700 mt-4 h-6 w-10"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="M9.5 0C4.3 0 0 4.3 0 9.6c0 5.2 4.2 9.5 9.4 9.6l-3 4.8h6.2l4.3-7.1c1-1.7 1.6-3.7 1.6-5.7V9.6C18.5 4.3 14.7 0 9.5 0Zm21 0c-5.2 0-9.5 4.3-9.5 9.6 0 5.2 4.2 9.5 9.4 9.6l-3 4.8h6.2l4.3-7.1c1-1.7 1.6-3.7 1.6-5.7V9.6C39.5 4.3 35.7 0 30.5 0Z" />
                </svg>
                {/* mt-auto on the attribution pins it to the card's bottom, so a
                    short quote next to a long one still lines its name up. */}
                <blockquote className="text-ink-600 mt-3 text-[15px] leading-relaxed">
                  {testimonial.quote}
                </blockquote>
                <p className="font-heading text-ink-900 mt-auto pt-5 text-right text-sm font-bold tracking-wide uppercase">
                  {testimonial.personName}
                </p>
                <p className="font-heading text-ink-600 mt-1.5 text-right text-xs font-medium tracking-wide uppercase">
                  {testimonial.personTitle}
                </p>
              </figure>
            </li>
          ))}
        </ul>

        <div className="flex w-full items-center justify-between self-stretch">
          <button
            type="button"
            onClick={() => page(-1)}
            disabled={atStart}
            aria-label="Previous testimonials"
            className="bg-steel-100/90 text-navy-950 shadow-card flex size-10 items-center justify-center rounded-full transition-all duration-200 hover:scale-110 hover:bg-white focus-visible:ring-[3px] focus-visible:ring-cyan-400 disabled:pointer-events-none disabled:opacity-40"
          >
            <ArrowLeft size={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => page(1)}
            disabled={atEnd}
            aria-label="Next testimonials"
            className="bg-steel-100/90 text-navy-950 shadow-card flex size-10 items-center justify-center rounded-full transition-all duration-200 hover:scale-110 hover:bg-white focus-visible:ring-[3px] focus-visible:ring-cyan-400 disabled:pointer-events-none disabled:opacity-40"
          >
            <ArrowRight size={20} aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
