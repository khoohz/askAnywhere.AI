import type { StoredNote } from '../notes/session-note-storage';
import type { NoteSessionRequest } from '../messaging/note-session-protocol';

export function loadSessionNotes(url: string) {
  return browser.runtime.sendMessage({ type: 'notes/load', url } satisfies NoteSessionRequest) as Promise<StoredNote[]>;
}

export function saveSessionNotes(url: string, notes: StoredNote[]) {
  return browser.runtime.sendMessage({ type: 'notes/save', url, notes } satisfies NoteSessionRequest) as Promise<void>;
}
