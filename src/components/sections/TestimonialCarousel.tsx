import { useCallback, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { Testimonial } from '@/types/wordpress';
import { heroSrcSet } from '@/utils/responsive-image';

interface Props {
  testimonials: Testimonial[];
}

export default function TestimonialCarousel({ testimonials }: Props) {
  const [[index, direction], setState] = useState<[number, 1 | -1]>([0, 1]);
  const prefersReducedMotion = useReducedMotion();

  const paginate = useCallback(
    (dir: 1 | -1) => {
      setState(([i]) => [(i + dir + testimonials.length) % testimonials.length, dir]);
    },
    [testimonials.length],
  );

  // WordPress can legitimately return zero testimonials (all unpublished, or
  // none created yet) — wpFetch()'s seed fallback only kicks in on a failed
  // request, not a valid empty array, so this is a real, reachable state.
  // Render nothing rather than crash or show fake content; every page that
  // uses this component (home, about, approach) treats it as an optional
  // section, so an empty testimonials list simply means the section is
  // absent for this render.
  if (testimonials.length === 0) return null;

  // Safe post-guard: `index` is always < testimonials.length here because
  // `paginate` derives the next index modulo the (now known non-zero) array
  // length, and it starts at 0.
  const active = testimonials[index % testimonials.length]!;

  const slideVariants = {
    enter: (dir: 1 | -1) => ({
      opacity: 0,
      x: prefersReducedMotion ? 0 : dir * 48,
    }),
    center: { opacity: 1, x: 0 },
    exit: (dir: 1 | -1) => ({
      opacity: 0,
      x: prefersReducedMotion ? 0 : dir * -48,
    }),
  };

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Client testimonials"
      className="bg-navy-900 relative isolate overflow-hidden"
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.div
          key={`bg-${active.id}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="absolute inset-0 -z-10"
          aria-hidden="true"
        >
          <img
            src={active.backgroundImage.url}
            srcSet={heroSrcSet(active.backgroundImage.url)}
            sizes="100vw"
            alt=""
            className="size-full object-cover"
            loading="lazy"
            decoding="async"
          />
          <div className="from-navy-950/70 via-navy-800/45 to-navy-900/35 absolute inset-0 bg-gradient-to-r" />
        </motion.div>
      </AnimatePresence>

      <div className="container-page relative flex min-h-[540px] flex-col items-center justify-center gap-10 py-16 sm:min-h-[730px] sm:py-20 lg:items-end">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.figure
            key={active.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="bg-steel-100 shadow-lifted w-full max-w-[360px] rounded-xl p-8"
            aria-roledescription="slide"
            aria-label={`Testimonial ${index + 1} of ${testimonials.length}: ${active.companyName}`}
          >
            <img
              src={active.companyLogo.url}
              alt={active.companyLogo.alt}
              width={440}
              height={176}
              className="h-24 w-auto object-contain"
              loading="lazy"
              decoding="async"
            />
            <figcaption className="font-heading text-ink-900 mt-5 text-lg font-bold tracking-normal uppercase">
              {active.companyName}
            </figcaption>
            <svg
              viewBox="0 0 40 24"
              className="fill-navy-700 mt-4 h-6 w-10"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M9.5 0C4.3 0 0 4.3 0 9.6c0 5.2 4.2 9.5 9.4 9.6l-3 4.8h6.2l4.3-7.1c1-1.7 1.6-3.7 1.6-5.7V9.6C18.5 4.3 14.7 0 9.5 0Zm21 0c-5.2 0-9.5 4.3-9.5 9.6 0 5.2 4.2 9.5 9.4 9.6l-3 4.8h6.2l4.3-7.1c1-1.7 1.6-3.7 1.6-5.7V9.6C39.5 4.3 35.7 0 30.5 0Z" />
            </svg>
            <blockquote className="text-ink-600 mt-3 text-[15px] leading-relaxed">
              {active.quote}
            </blockquote>
            <p className="font-heading text-ink-900 mt-5 text-right text-sm font-bold tracking-wide uppercase">
              {active.personName}
            </p>
            <p className="font-heading text-ink-600 mt-1.5 text-right text-xs font-medium tracking-wide uppercase">
              {active.personTitle}
            </p>
          </motion.figure>
        </AnimatePresence>

        {/*
          Nav buttons render in normal flow directly below the card (not
          absolutely positioned over it) so they can never overlap — a
          longer real quote grows the card's height, and an absolutely
          positioned button anchored to the section's bottom edge would
          collide with it. This guarantees a fixed gap regardless of quote
          length, language, or viewport. `self-stretch` + `justify-between`
          spreads the pair to the row's own left/right edges (matching
          container-page's width, so they land near the section's edges on
          every breakpoint) instead of sitting as a tight centered pair.
        */}
        <div className="flex w-full items-center justify-between self-stretch">
          <button
            type="button"
            onClick={() => paginate(-1)}
            aria-label="Previous testimonial"
            className="bg-steel-100/90 text-navy-950 shadow-card flex size-10 items-center justify-center rounded-full transition-all duration-200 hover:scale-110 hover:bg-white focus-visible:ring-[3px] focus-visible:ring-cyan-400"
          >
            <ArrowLeft size={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => paginate(1)}
            aria-label="Next testimonial"
            className="bg-steel-100/90 text-navy-950 shadow-card flex size-10 items-center justify-center rounded-full transition-all duration-200 hover:scale-110 hover:bg-white focus-visible:ring-[3px] focus-visible:ring-cyan-400"
          >
            <ArrowRight size={20} aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
