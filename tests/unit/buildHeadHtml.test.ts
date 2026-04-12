import { describe, it, expect } from 'vitest';
import { buildHeadHtmlFromSEO } from '../../src/ssr/buildHeadHtml.js';

describe('buildHeadHtmlFromSEO', () => {
  it('builds title and meta for minimal props', () => {
    const result = buildHeadHtmlFromSEO({ title: 'My Title', description: 'My Desc' });

    expect(result.title).toBe('<title>My Title</title>');
    expect(result.meta).toContain('name="description" content="My Desc"');
    expect(result.meta).toContain('og:title');
    expect(result.meta).toContain('og:description');
    expect(result.meta).toContain('og:type" content="website"');
    expect(result.meta).toContain('twitter:card');
    expect(result.link).toBe('');
    expect(result.script).toBe('');
  });

  it('includes og:image and twitter:image when image provided', () => {
    const result = buildHeadHtmlFromSEO({
      title: 'T',
      description: 'D',
      image: 'https://example.com/img.png',
    });

    expect(result.meta).toContain('og:image" content="https://example.com/img.png"');
    expect(result.meta).toContain('twitter:image" content="https://example.com/img.png"');
  });

  it('includes canonical link and og:url when url provided', () => {
    const result = buildHeadHtmlFromSEO({
      title: 'T',
      description: 'D',
      url: 'https://example.com/page',
    });

    expect(result.link).toContain('rel="canonical" href="https://example.com/page"');
    expect(result.meta).toContain('og:url" content="https://example.com/page"');
  });

  it('includes noindex meta when noindex is true', () => {
    const result = buildHeadHtmlFromSEO({
      title: 'T',
      description: 'D',
      noindex: true,
    });

    expect(result.meta).toContain('name="robots" content="noindex, nofollow"');
  });

  it('includes JSON-LD script when structuredData provided', () => {
    const sd = { '@type': 'Article', name: 'Test' };
    const result = buildHeadHtmlFromSEO({
      title: 'T',
      description: 'D',
      structuredData: sd,
    });

    expect(result.script).toContain('application/ld+json');
    expect(result.script).toContain(JSON.stringify(sd));
  });

  it('escapes HTML in title and description', () => {
    const result = buildHeadHtmlFromSEO({
      title: '<script>alert("xss")</script>',
      description: 'a&b "quoted"',
    });

    expect(result.title).not.toContain('<script>');
    expect(result.title).toContain('&lt;script&gt;');
    expect(result.meta).toContain('a&amp;b &quot;quoted&quot;');
  });
});
