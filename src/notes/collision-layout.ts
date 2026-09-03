export interface NoteBox {
  id: string;
  behavior: 'auto' | 'manual-open' | 'manual-collapsed';
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Offset {
  x: number;
  y: number;
}

/** Applies only the smallest downward nudge to automatically placed notes. */
export function resolveNoteOffsets(notes: NoteBox[]): Record<string, Offset> {
  const placed: NoteBox[] = [];
  const offsets: Record<string, Offset> = {};

  for (const note of notes) {
    let y = 0;
    if (note.behavior === 'auto') {
      for (const previous of placed) {
        const shiftedTop = note.top + y;
        const overlapsHorizontally = note.left < previous.left + previous.width && note.left + note.width > previous.left;
        const overlapsVertically = shiftedTop < previous.top + previous.height && shiftedTop + note.height > previous.top;
        if (overlapsHorizontally && overlapsVertically) {
          y = Math.max(y, previous.top + previous.height + 12 - note.top);
        }
      }
    }
    offsets[note.id] = { x: 0, y };
    placed.push({ ...note, top: note.top + y });
  }
  return offsets;
}
