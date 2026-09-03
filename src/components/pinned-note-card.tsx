import { GripVertical, Link, MoreHorizontal, Pin, RotateCcw, SendHorizontal, Square, Trash2, Unlink } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

import { MarkdownResponse } from './markdown-response';
import { isResizeHandlePointer } from './resize-handle';
import type { PinnedNote } from '../notes/note';

interface PinnedNoteCardProps {
  note: PinnedNote;
  collisionOffset: { x: number; y: number };
  onCollapse(noteId: string, collapsed: boolean): void;
  onDrag(noteId: string, offset: { x: number; y: number }): void;
  onDelete(noteId: string): void;
  onReselect(noteId: string): void;
  onResize(noteId: string, dimensions: { width: number; height: number }): void;
  onRetry(noteId: string): void;
  onSend(noteId: string, question: string): void;
  onStop(noteId: string): void;
}

export function PinnedNoteCard({ collisionOffset, note, onCollapse, onDelete, onDrag, onReselect, onResize, onRetry, onSend, onStop }: PinnedNoteCardProps) {
  const [question, setQuestion] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number } | undefined>(undefined);
  const resizeGestureRef = useRef<{ width: number; height: number } | undefined>(undefined);

  useEffect(() => {
    const finishResize = () => {
      const initialDimensions = resizeGestureRef.current;
      const card = cardRef.current;
      resizeGestureRef.current = undefined;
      if (!initialDimensions || !card) {
        return;
      }
      const { height, width } = card.getBoundingClientRect();
      if (Math.abs(initialDimensions.width - width) > 1 || Math.abs(initialDimensions.height - height) > 1) {
        onResize(note.id, { width, height });
      }
    };
    window.addEventListener('pointerup', finishResize);
    window.addEventListener('pointercancel', finishResize);
    return () => {
      window.removeEventListener('pointerup', finishResize);
      window.removeEventListener('pointercancel', finishResize);
    };
  }, [note.id, onResize]);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) {
        return;
      }
      onDrag(note.id, {
        x: event.clientX - note.selection.rect.left - drag.x,
        y: event.clientY - note.selection.rect.top - drag.y,
      });
    };
    const onPointerUp = () => {
      dragRef.current = undefined;
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [note.id, note.selection.rect.left, note.selection.rect.top, onDrag]);

  const questionPreview = note.messages.find((message) => message.role === 'user')?.content || note.selection.text;
  const left = note.selection.rect.left + note.offset.x + collisionOffset.x;
  const top = note.selection.rect.top + note.offset.y + collisionOffset.y;

  return (
    <motion.section
      animate={{ left, top, opacity: 1 }}
      aria-label={`Pinned note: ${questionPreview}`}
      className={`chat-card pinned-note ${note.collapsed ? 'is-collapsed' : 'is-expanded'}`}
      initial={{ opacity: 0, scale: 0.98 }}
      layout
      ref={cardRef}
      onPointerDownCapture={(event) => {
        const card = cardRef.current;
        if (!card || note.collapsed || event.button !== 0) {
          return;
        }
        const rect = card.getBoundingClientRect();
        if (isResizeHandlePointer(event, rect)) {
          resizeGestureRef.current = { height: rect.height, width: rect.width };
        }
      }}
      style={{ height: note.collapsed ? undefined : note.dimensions?.height, position: 'fixed', width: note.dimensions?.width }}
      transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
    >
      <header
        className="pinned-note-header"
        onPointerDown={(event) => {
          if ((event.target as Element).closest('button')) {
            return;
          }
          dragRef.current = {
            x: event.clientX - left,
            y: event.clientY - top,
          };
        }}
      >
        <GripVertical aria-hidden="true" className="drag-handle" size={16} />
        <button
          aria-label={note.collapsed ? 'Expand note' : 'Collapse note'}
          className="pinned-note-title"
          onClick={() => onCollapse(note.id, !note.collapsed)}
          type="button"
        >
          {questionPreview}
        </button>
        {note.detached
          ? <Unlink aria-label="Source needs reattachment" className="pinned-indicator detached-indicator" size={15} />
          : <Pin aria-label="Pinned" className="pinned-indicator" fill="currentColor" size={15} />}
        <button aria-expanded={menuOpen} aria-label="Note actions" className="note-menu-trigger" onClick={() => setMenuOpen((open) => !open)} type="button">
          <MoreHorizontal aria-hidden="true" size={17} />
        </button>
        {menuOpen && (
          <div className="note-menu" role="menu">
            <button className="note-menu-neutral" onClick={() => { onReselect(note.id); setMenuOpen(false); }} role="menuitem" type="button">
              <Link aria-hidden="true" size={14} /> Reselect source
            </button>
            <button onClick={() => onDelete(note.id)} role="menuitem" type="button">
              <Trash2 aria-hidden="true" size={14} /> Delete note
            </button>
          </div>
        )}
      </header>

      {!note.collapsed && (
        <>
          {note.messages.length > 0 && (
            <div className="chat-body" aria-live="polite">
              {note.messages.map((message, index) => message.content && (
                <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}>
                  {message.role === 'assistant' ? <MarkdownResponse content={message.content} /> : message.content}
                </div>
              ))}
            </div>
          )}
          {note.error && (
            <div className="chat-error" role="alert">
              <span>{note.error}</span>
              <button className="retry-button" onClick={() => onRetry(note.id)} type="button">
                <RotateCcw aria-hidden="true" size={13} /> Retry
              </button>
            </div>
          )}
          <form
            className="chat-composer"
            onSubmit={(event) => {
              event.preventDefault();
              if (question.trim()) {
                onSend(note.id, question.trim());
                setQuestion('');
              }
            }}
          >
            <input
              aria-label="Ask a follow-up"
              disabled={note.isStreaming}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask a follow-up..."
              value={question}
            />
            <button
              aria-label={note.isStreaming ? 'Stop generating' : 'Send follow-up'}
              className="send-button"
              disabled={!note.isStreaming && !question.trim()}
              onClick={note.isStreaming ? () => onStop(note.id) : undefined}
              type={note.isStreaming ? 'button' : 'submit'}
            >
              {note.isStreaming ? <Square fill="currentColor" size={15} /> : <SendHorizontal size={18} />}
            </button>
          </form>
        </>
      )}
    </motion.section>
  );
}
