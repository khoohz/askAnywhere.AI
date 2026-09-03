import { describe, expect, it } from 'vitest';

import { createNoteSessionStore } from '../src/notes/session-note-storage';

describe('note session storage', () => {
  it('isolates the same route between tabs', async () => {
    const data = new Map<string, unknown>();
    const store = createNoteSessionStore({
      async get(key) {
        return { [key]: data.get(key) as [] | undefined };
      },
      async set(items) {
        for (const [key, value] of Object.entries(items)) {
          data.set(key, value);
        }
      },
    });
    const note = {
      id: 'note-1',
      anchor: { selectedText: 'MVCC', textBefore: '', textAfter: '' },
      messages: [{ role: 'user' as const, content: 'Why?' }],
      contextMode: 'selection' as const,
      offset: { x: 12, y: 20 },
      collapsed: false,
      behavior: 'auto' as const,
    };

    await store.save(4, 'https://example.test/docs', [note]);

    expect(await store.load(4, 'https://example.test/docs')).toEqual([note]);
    expect(await store.load(9, 'https://example.test/docs')).toEqual([]);
    expect(await store.load(4, 'https://example.test/other')).toEqual([]);
  });
});
