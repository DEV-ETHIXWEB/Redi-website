/**
 * Barrel export for the entire WordPress content-service layer. Pages and
 * components should import from `@/services/wordpress` (this file), not
 * from the individual `./<domain>.ts` files directly — that keeps call
 * sites agnostic to how the service layer is internally organized.
 *
 * For the full API contract (endpoints, methods, response shapes, required
 * WordPress plugins/CPTs/custom routes) see docs/WORDPRESS_INTEGRATION.md
 * and the JSDoc on each exported function below.
 */
export * from './client';
export * from './site-settings';
export * from './properties';
export * from './team';
export * from './testimonials';
export * from './partners';
export * from './scores';
export * from './advantages';
export * from './blog';
export * from './legal';
export * from './pages';
