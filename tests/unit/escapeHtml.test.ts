import { describe, it, expect } from 'vitest';
import { escapeHtml } from '../../src/utils/escapeHtml.js';

describe('escapeHtml', () => {
  it('returns empty string unchanged', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('returns string without special chars unchanged', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });

  it('escapes ampersand', () => {
    expect(escapeHtml('a&b')).toBe('a&amp;b');
  });

  it('escapes angle brackets', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
  });

  it('escapes quotes', () => {
    expect(escapeHtml('"it\'s"')).toBe('&quot;it&#39;s&quot;');
  });

  it('escapes all special chars together', () => {
    expect(escapeHtml('<a href="x">&\'')).toBe(
      '&lt;a href=&quot;x&quot;&gt;&amp;&#39;'
    );
  });
});
