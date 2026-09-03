import type { Rect } from './selection';

export interface CardSize {
  width: number;
  height: number;
}

export interface ViewportSize {
  width: number;
  height: number;
}

export interface CardPosition {
  placement: 'right' | 'above' | 'below';
  left: number;
  top: number;
}

const GAP = 12;
const MARGIN = 16;

export function positionCard(selection: Rect, card: CardSize, viewport: ViewportSize): CardPosition {
  const maxLeft = viewport.width - MARGIN - card.width;
  const maxTop = viewport.height - MARGIN - card.height;
  const clampLeft = (value: number) => clamp(value, MARGIN, maxLeft);
  const clampTop = (value: number) => clamp(value, MARGIN, maxTop);

  if (selection.right + GAP + card.width <= viewport.width - MARGIN) {
    return { placement: 'right', left: selection.right + GAP, top: clampTop(selection.top) };
  }

  if (selection.top - GAP - card.height >= MARGIN) {
    return { placement: 'above', left: clampLeft(selection.left), top: selection.top - GAP - card.height };
  }

  return { placement: 'below', left: clampLeft(selection.left), top: clampTop(selection.bottom + GAP) };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}
