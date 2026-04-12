import type { SEOProps } from '../components/SEOContext.js';
import { escapeHtml } from '../utils/escapeHtml.js';

export function buildHeadHtmlFromSEO(props: SEOProps): {
  title: string;
  meta: string;
  link: string;
  script: string;
} {
  const title = `<title>${escapeHtml(props.title)}</title>`;
  const metaTags: string[] = [
    `<meta name="description" content="${escapeHtml(props.description)}">`,
    props.noindex ? '<meta name="robots" content="noindex, nofollow">' : null,
    `<meta property="og:title" content="${escapeHtml(props.title)}">`,
    `<meta property="og:description" content="${escapeHtml(props.description)}">`,
    `<meta property="og:type" content="${escapeHtml(props.type ?? 'website')}">`,
    props.url ? `<meta property="og:url" content="${escapeHtml(props.url)}">` : null,
    props.image ? `<meta property="og:image" content="${escapeHtml(props.image)}">` : null,
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${escapeHtml(props.title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(props.description)}">`,
    props.image ? `<meta name="twitter:image" content="${escapeHtml(props.image)}">` : null,
  ].filter((t): t is string => t != null);
  const meta = metaTags.join('\n');
  const link = props.url
    ? `<link rel="canonical" href="${escapeHtml(props.url)}">`
    : '';
  const script =
    props.structuredData != null
      ? `<script type="application/ld+json">${JSON.stringify(props.structuredData)}</script>`
      : '';
  return { title, meta, link, script };
}
