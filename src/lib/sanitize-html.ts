import sanitizeHtmlLib from 'sanitize-html';

/**
 * Sanitizes rich-text HTML before it's rendered with `set:html`.
 *
 * Every current caller (legal page sections, blog post bodies) only ever
 * receives content from our own seed JSON — there's no live CMS wired up
 * yet, so nothing user- or editor-supplied reaches this today. This exists
 * so that stays true once `WORDPRESS_API_URL` points at a real backend and
 * non-developers can edit that copy — at that point this becomes the one
 * place stray `<script>`/`onerror=`/etc. gets stripped before it reaches a
 * visitor's browser, rather than something each new content field has to
 * remember to handle itself.
 *
 * The allowlist covers standard rich-text formatting (headings, paragraphs,
 * lists, links, emphasis, tables) — enough for real editorial content,
 * nothing that executes.
 */
export function sanitizeRichText(html: string): string {
  return sanitizeHtmlLib(html, {
    allowedTags: [
      'p',
      'br',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'strong',
      'b',
      'em',
      'i',
      'u',
      'a',
      'ul',
      'ol',
      'li',
      'blockquote',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'hr',
      'span',
    ],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      span: ['class'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    transformTags: {
      // Force-add rel="noopener noreferrer" on any target="_blank" link,
      // regardless of what the source HTML specified.
      a: sanitizeHtmlLib.simpleTransform('a', { rel: 'noopener noreferrer' }, true),
    },
  });
}
