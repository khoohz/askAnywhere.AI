import { describe, expect, it } from 'vitest';

import { resolveNoteOffsets } from '../src/notes/collision-layout';

describe('pinned-note collision layout', () => {
  it('nudges only automatic notes by the smallest safe amount', () => {
    expect(resolveNoteOffsets([
      { id: 'first', behavior: 'auto', left: 100, top: 100, width: 300, height: 100 },
      { id: 'second', behavior: 'auto', left: 120, top: 140, width: 300, height: 80 },
    ])).toEqual({ first: { x: 0, y: 0 }, second: { x: 0, y: 72 } });
  });

  it('never moves a manually positioned note', () => {
    expect(resolveNoteOffsets([
      { id: 'first', behavior: 'auto', left: 100, top: 100, width: 300, height: 100 },
      { id: 'manual', behavior: 'manual-open', left: 120, top: 140, width: 300, height: 80 },
    ]).manual).toEqual({ x: 0, y: 0 });
  });
});
