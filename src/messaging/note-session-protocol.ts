import type { StoredNote } from '../notes/session-note-storage';

export type NoteSessionRequest =
  | { type: 'notes/load'; url: string }
  | { type: 'notes/save'; url: string; notes: StoredNote[] };

export function isNoteSessionRequest(value: unknown): value is NoteSessionRequest {
  if (!value || typeof value !== 'object' || !('type' in value) || !('url' in value) || typeof value.url !== 'string') {
    return false;
  }
  return value.type === 'notes/load' || (value.type === 'notes/save' && 'notes' in value && Array.isArray(value.notes));
}
