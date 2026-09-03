import type { ChatMessage } from '../providers/provider';
import type { NoteBehavior } from './note';

export interface TextAnchor {
  selectedText: string;
  textBefore: string;
  textAfter: string;
  cssPath?: string;
}

export interface StoredNote {
  id: string;
  anchor: TextAnchor;
  messages: ChatMessage[];
  contextMode: 'selection' | 'paragraph' | 'section' | 'page';
  offset: { x: number; y: number };
  dimensions?: { width: number; height: number };
  collapsed: boolean;
  behavior: NoteBehavior;
}

export interface NoteSessionStorage {
  get(key: string): Promise<Record<string, StoredNote[] | undefined>>;
  set(items: Record<string, StoredNote[]>): Promise<void>;
}

export function createNoteSessionStore(storage: NoteSessionStorage) {
  return {
    async load(tabId: number, url: string) {
      const key = noteSessionKey(tabId, url);
      return (await storage.get(key))[key] ?? [];
    },
    save(tabId: number, url: string, notes: StoredNote[]) {
      return storage.set({ [noteSessionKey(tabId, url)]: notes });
    },
  };
}

export function noteSessionKey(tabId: number, url: string) {
  return `annotation-notes:${tabId}:${url}`;
}
