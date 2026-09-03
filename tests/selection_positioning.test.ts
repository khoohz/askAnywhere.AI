import { describe, expect, it } from 'vitest';

import { captureSelection } from '../src/content/selection';
import { positionCard } from '../src/content/positioning';

describe('selection-to-inline-card seam', () => {
  it('creates an inline-card source only for meaningful text', () => {
    const snapshot = captureSelection({
      isCollapsed: false,
      rangeCount: 1,
      toString: () => '  MVCC isolates readers.  ',
      getRangeAt: () => ({
        getBoundingClientRect: () => rect(100, 120, 180, 24),
        getClientRects: () => [rect(100, 120, 180, 24), rect(100, 150, 120, 24)],
      }),
    });

    expect(snapshot).toEqual({
      text: 'MVCC isolates readers.',
      rect: rect(100, 120, 180, 24),
      rects: [rect(100, 120, 180, 24), rect(100, 150, 120, 24)],
    });
  });

  it('does not create a card for a collapsed selection', () => {
    expect(captureSelection({
      isCollapsed: true,
      rangeCount: 1,
      toString: () => 'Text',
      getRangeAt: () => ({ getBoundingClientRect: () => rect(0, 0, 1, 1), getClientRects: () => [] }),
    })).toBeUndefined();
  });
});

describe('card positioning seam', () => {
  const viewport = { width: 1000, height: 800 };
  const card = { width: 420, height: 44 };

  it('prefers the right side of a selection when it fits', () => {
    expect(positionCard(rect(100, 120, 180, 24), card, viewport)).toEqual({ placement: 'right', left: 292, top: 120 });
  });

  it('uses the space above when the right side would overflow', () => {
    expect(positionCard(rect(840, 120, 120, 24), card, viewport)).toEqual({ placement: 'above', left: 564, top: 64 });
  });

  it('uses the space below when neither right nor above is viable', () => {
    expect(positionCard(rect(840, 20, 120, 24), card, viewport)).toEqual({ placement: 'below', left: 564, top: 56 });
  });
});

function rect(left: number, top: number, width: number, height: number) {
  return { left, top, width, height, right: left + width, bottom: top + height };
}
