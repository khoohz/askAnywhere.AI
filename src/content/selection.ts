export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface RangeLike {
  getBoundingClientRect(): Rect;
  getClientRects(): Iterable<Rect>;
}

export interface SelectionLike {
  isCollapsed: boolean;
  rangeCount: number;
  toString(): string;
  getRangeAt(index: number): RangeLike;
}

export interface SelectionSnapshot {
  text: string;
  rect: Rect;
  rects: Rect[];
}

export function captureSelection(selection: SelectionLike | null): SelectionSnapshot | undefined {
  const text = selection?.toString().trim();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0 || !text) {
    return undefined;
  }

  const range = selection.getRangeAt(0);
  return {
    text,
    rect: toRect(range.getBoundingClientRect()),
    rects: Array.from(range.getClientRects(), toRect),
  };
}

function toRect(rect: Rect): Rect {
  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  };
}
