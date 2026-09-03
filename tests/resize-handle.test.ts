import { describe, expect, it } from 'vitest';

import { isResizeHandlePointer } from '../src/components/resize-handle';

describe('pinned note resize handle detection', () => {
  const card = { bottom: 220, right: 320 };

  it('recognizes a pointer on the native resize handle', () => {
    expect(isResizeHandlePointer({ clientX: 316, clientY: 216 }, card)).toBe(true);
  });

  it('does not mistake an ordinary card interaction for a resize', () => {
    expect(isResizeHandlePointer({ clientX: 300, clientY: 190 }, card)).toBe(false);
  });
});
