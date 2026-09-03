import { describe, expect, it } from 'vitest';

import { codeLanguageFromClassName } from '../src/components/code-language';

describe('fenced-code language detection', () => {
  it('recognizes the language class emitted by Markdown', () => {
    expect(codeLanguageFromClassName('language-ts')).toBe('ts');
  });

  it('does not mistake a literal backslash for a language class', () => {
    expect(codeLanguageFromClassName('language-\\w')).toBeUndefined();
  });
});
