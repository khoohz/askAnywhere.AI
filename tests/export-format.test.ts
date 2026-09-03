import { describe, expect, it } from 'vitest';

import { formatLocalExport, structuredStudyPrompt } from '../src/export/format';

const notes = [{
  id: 'n1',
  sourceText: 'MVCC lets readers see a consistent snapshot.',
  messages: [
    { role: 'user' as const, content: 'Why does MVCC matter?' },
    { role: 'assistant' as const, content: 'It avoids reader-writer blocking.' },
  ],
}];

describe('local note exports', () => {
  it('produces source-linked Knowledge Points without an LLM call', () => {
    expect(formatLocalExport(notes, 'knowledge-points', { title: 'Database notes', url: 'https://example.test/db' })).toContain(
      '## 1. Why does MVCC matter?\n\nIt avoids reader-writer blocking.\n\n> Source: MVCC lets readers see a consistent snapshot.',
    );
  });

  it('preserves every question and answer in Raw Q&A', () => {
    expect(formatLocalExport(notes, 'raw-qa', { title: '', url: 'https://example.test/db' })).toContain(
      '### Q: Why does MVCC matter?\n\nIt avoids reader-writer blocking.',
    );
  });

  it('frames structured-study generation around source-linked knowledge gaps', () => {
    expect(structuredStudyPrompt(notes)).toContain('avoid turning this into a generic page summary');
    expect(structuredStudyPrompt(notes)).toContain('Source: MVCC lets readers see a consistent snapshot.');
  });
});
