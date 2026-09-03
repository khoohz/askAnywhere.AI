import type { SelectionSnapshot } from '../content/selection';
import type { ChatMessage } from '../providers/provider';
import type { TextAnchor } from './session-note-storage';

export type ContextMode = 'selection' | 'paragraph' | 'section' | 'page';
export type NoteBehavior = 'auto' | 'manual-open' | 'manual-collapsed';

export interface StreamAttempt {
  sourceContext: string;
  messages: ChatMessage[];
}

export interface PinnedNote {
  id: string;
  selection: SelectionSnapshot;
  range?: Range;
  anchor: TextAnchor;
  detached: boolean;
  messages: ChatMessage[];
  contextMode: ContextMode;
  offset: { x: number; y: number };
  dimensions?: { width: number; height: number };
  collapsed: boolean;
  behavior: NoteBehavior;
  isStreaming: boolean;
  error?: string;
  lastAttempt?: StreamAttempt;
}
