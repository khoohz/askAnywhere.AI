import { motion } from 'framer-motion';
import { ChevronDown, Download, MoreHorizontal, PanelTopClose, PanelTopOpen, Pin, Power, RotateCcw, SendHorizontal, Settings2, Square, Trash2 } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { positionCard, type CardPosition } from '../content/positioning';
import { captureSelection } from '../content/selection';
import { loadSessionNotes, saveSessionNotes } from '../content/note-session-client';
import { createProviderStreamClient } from '../content/provider-stream-client';
import type { ProviderPortEvent } from '../messaging/provider-protocol';
import type { ContextMode, PinnedNote, StreamAttempt } from '../notes/note';
import { createTextAnchor, reanchorText, snapshotFromRange } from '../notes/anchors';
import { resolveNoteOffsets } from '../notes/collision-layout';
import type { StoredNote } from '../notes/session-note-storage';
import type { ChatMessage } from '../providers/provider';
import { useAnnotationStore } from '../stores/annotation-store';
import { MarkdownResponse } from './markdown-response';
import { PinnedNoteCard } from './pinned-note-card';
import { ExportPanel } from './export-panel';
import { ApiKeyConfiguration } from './api-key-configuration';

const INITIAL_CARD_SIZE = { width: 420, height: 44 };

export function AnnotationLayer() {
  const { enabled, selection, setEnabled, setSelection, clearSelection } = useAnnotationStore();
  const [range, setRange] = useState<Range>();
  const [contextMode, setContextMode] = useState<ContextMode>('selection');
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isProviderBusy, setIsProviderBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [position, setPosition] = useState<CardPosition>();
  const [pinnedNotes, setPinnedNotes] = useState<PinnedNote[]>([]);
  const [deletedNote, setDeletedNote] = useState<PinnedNote>();
  const [exportOpen, setExportOpen] = useState(false);
  const [configurationOpen, setConfigurationOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const layerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const clientRef = useRef<ReturnType<typeof createProviderStreamClient> | undefined>(undefined);
  const activeRequestIdRef = useRef<string | undefined>(undefined);
  const activePinnedNoteIdRef = useRef<string | undefined>(undefined);
  const reselectingNoteIdRef = useRef<string | undefined>(undefined);
  const lastAttemptRef = useRef<StreamAttempt | undefined>(undefined);
  const pinnedNotesRef = useRef<PinnedNote[]>([]);
  const restoredRef = useRef(false);
  const routeUrlRef = useRef(window.location.href);
  const collisionOffsets = resolveNoteOffsets(pinnedNotes.map((note) => ({
    id: note.id,
    behavior: note.behavior,
    left: note.selection.rect.left + note.offset.x,
    top: note.selection.rect.top + note.offset.y,
    width: note.dimensions?.width ?? 420,
    height: note.dimensions?.height ?? (note.collapsed ? 42 : 240),
  })));

  useEffect(() => {
    pinnedNotesRef.current = pinnedNotes;
  }, [pinnedNotes]);

  useEffect(() => {
    if (!deletedNote) {
      return;
    }
    const timeout = window.setTimeout(() => setDeletedNote(undefined), 5_000);
    return () => window.clearTimeout(timeout);
  }, [deletedNote]);

  useEffect(() => {
    const client = createProviderStreamClient((event) => handleProviderEvent(event));
    clientRef.current = client;
    return () => client.disconnect();
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const capture = () => {
      if (activeRequestIdRef.current) {
        return;
      }
      const browserSelection = window.getSelection();
      const snapshot = captureSelection(browserSelection);
      if (!snapshot || !browserSelection) {
        return;
      }

      const selectedRange = browserSelection.getRangeAt(0).cloneRange();
      browserSelection.removeAllRanges();
      const reselectingNoteId = reselectingNoteIdRef.current;
      if (reselectingNoteId) {
        reselectingNoteIdRef.current = undefined;
        updatePinnedNote(reselectingNoteId, (note) => ({
          ...note,
          anchor: createTextAnchor(selectedRange, snapshot.text),
          detached: false,
          range: selectedRange,
          selection: snapshot,
        }));
        return;
      }

      setRange(selectedRange);
      setSelection(snapshot);
      setContextMode('selection');
      setQuestion('');
      setMessages([]);
      setError(undefined);
      setIsStreaming(false);
      lastAttemptRef.current = undefined;
    };

    const onMouseUp = (event: MouseEvent) => {
      if ((cardRef.current && event.composedPath().includes(cardRef.current))
        || (layerRef.current && event.composedPath().includes(layerRef.current))) {
        return;
      }
      queueMicrotask(capture);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Shift' || event.key.startsWith('Arrow')) {
        queueMicrotask(capture);
      }
    };

    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('keyup', onKeyUp);
    return () => {
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('keyup', onKeyUp);
    };
  }, [enabled, setSelection]);

  useEffect(() => {
    let cancelled = false;
    const restore = async (url: string) => {
      const storedNotes = await loadSessionNotes(url);
      if (cancelled) {
        return;
      }
      setPinnedNotes(storedNotes.map(restoreNote));
      restoredRef.current = true;
    };
    void restore(routeUrlRef.current).catch(() => {
      restoredRef.current = true;
    });

    const onRouteChange = () => {
      const nextUrl = window.location.href;
      if (nextUrl === routeUrlRef.current) {
        return;
      }
      void (async () => {
        await saveSessionNotes(routeUrlRef.current, pinnedNotesRef.current.map(storeNote));
        routeUrlRef.current = nextUrl;
        setPinnedNotes((await loadSessionNotes(nextUrl)).map(restoreNote));
      })();
    };
    window.addEventListener('hashchange', onRouteChange);
    window.addEventListener('popstate', onRouteChange);
    const routeObserver = new MutationObserver(onRouteChange);
    routeObserver.observe(document.documentElement, { childList: true, subtree: true });
    return () => {
      cancelled = true;
      window.removeEventListener('hashchange', onRouteChange);
      window.removeEventListener('popstate', onRouteChange);
      routeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (restoredRef.current) {
      void saveSessionNotes(routeUrlRef.current, pinnedNotes.map(storeNote));
    }
  }, [pinnedNotes]);

  useEffect(() => {
    if (pinnedNotes.length === 0) {
      return;
    }

    let scheduled = false;
    let reanchorAfterMutation = false;
    const updateAnchors = () => {
      scheduled = false;
      const shouldReanchor = reanchorAfterMutation;
      reanchorAfterMutation = false;
      setPinnedNotes((notes) => {
        let changed = false;
        const updatedNotes = notes.map((note) => {
          let current = note;
          if (shouldReanchor && !note.detached && (!note.range || !rangeStillMatches(note.range, note.anchor.selectedText))) {
            const reanchoredRange = reanchorText(note.anchor);
            if (!reanchoredRange) {
              changed = true;
              return { ...note, detached: true, range: undefined };
            }
            current = {
              ...note,
              detached: false,
              range: reanchoredRange,
              selection: snapshotFromRange(reanchoredRange),
            };
            changed = true;
          }

          if (!current.range) {
            return current;
          }
          const rect = current.range.getBoundingClientRect();
          const selectionRect = {
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height,
          };
          const selectionRects = Array.from(current.range.getClientRects(), (clientRect) => ({
            left: clientRect.left,
            top: clientRect.top,
            right: clientRect.right,
            bottom: clientRect.bottom,
            width: clientRect.width,
            height: clientRect.height,
          }));
          const isVisible = rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
          const collapsed = current.behavior === 'auto' ? !isVisible : current.collapsed;
          if (sameRect(current.selection.rect, selectionRect) && current.collapsed === collapsed) {
            return current;
          }
          changed = true;
          return { ...current, collapsed, selection: { ...current.selection, rect: selectionRect, rects: selectionRects } };
        });
        return changed ? updatedNotes : notes;
      });
    };
    const scheduleUpdate = (afterMutation = false) => {
      reanchorAfterMutation ||= afterMutation;
      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(updateAnchors);
      }
    };
    const mutationObserver = new MutationObserver(() => scheduleUpdate(true));
    mutationObserver.observe(document.body, { childList: true, characterData: true, subtree: true });
    const onViewportChange = () => scheduleUpdate();
    window.addEventListener('resize', onViewportChange);
    window.addEventListener('scroll', onViewportChange, true);
    scheduleUpdate();
    return () => {
      mutationObserver.disconnect();
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('scroll', onViewportChange, true);
    };
  }, [pinnedNotes.length]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }
      setExportOpen(false);
      setConfigurationOpen(false);
      setMoreOpen(false);
      if (selection) {
        clearSelection();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [clearSelection, selection]);

  useLayoutEffect(() => {
    if (!selection) {
      setPosition(undefined);
      return;
    }

    const update = () => {
      const bounds = cardRef.current?.getBoundingClientRect();
      setPosition(positionCard(
        selection.rect,
        bounds ? { width: bounds.width, height: bounds.height } : INITIAL_CARD_SIZE,
        { width: window.innerWidth, height: window.innerHeight },
      ));
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [selection, messages, error, isStreaming]);

  useEffect(() => {
    if (selection) {
      inputRef.current?.focus();
    }
  }, [selection]);

  function handleProviderEvent(event: ProviderPortEvent) {
    if (event.requestId !== activeRequestIdRef.current) {
      return;
    }

    if (event.type === 'provider/delta') {
      const pinnedNoteId = activePinnedNoteIdRef.current;
      if (pinnedNoteId) {
        setPinnedNotes((notes) => notes.map((note) => note.id === pinnedNoteId
          ? { ...note, messages: appendAssistantDelta(note.messages, event.text) }
          : note));
      } else {
        setMessages((current) => appendAssistantDelta(current, event.text));
      }
      return;
    }

    if (event.type === 'provider/error') {
      const pinnedNoteId = activePinnedNoteIdRef.current;
      if (pinnedNoteId) {
        setPinnedNotes((notes) => notes.map((note) => note.id === pinnedNoteId ? { ...note, error: event.message } : note));
      } else {
        setError(event.message);
      }
    }
    if (event.type === 'provider/complete' || event.type === 'provider/stopped' || event.type === 'provider/error') {
      const pinnedNoteId = activePinnedNoteIdRef.current;
      if (pinnedNoteId) {
        setPinnedNotes((notes) => notes.map((note) => note.id === pinnedNoteId ? { ...note, isStreaming: false } : note));
      } else {
        setIsStreaming(false);
      }
      activeRequestIdRef.current = undefined;
      activePinnedNoteIdRef.current = undefined;
      setIsProviderBusy(false);
    }
  }

  function startAttempt(attempt: StreamAttempt, initialMessages: ChatMessage[], pinnedNoteId?: string) {
    const client = clientRef.current;
    if (!client) {
      setError('The extension connection is not ready. Please try again.');
      return;
    }

    const requestId = crypto.randomUUID();
    activeRequestIdRef.current = requestId;
    activePinnedNoteIdRef.current = pinnedNoteId;
    setIsProviderBusy(true);
    if (pinnedNoteId) {
      setPinnedNotes((notes) => notes.map((note) => note.id === pinnedNoteId
        ? { ...note, error: undefined, isStreaming: true, lastAttempt: attempt, messages: initialMessages }
        : note));
    } else {
      lastAttemptRef.current = attempt;
      setMessages(initialMessages);
      setError(undefined);
      setIsStreaming(true);
    }
    client.start({ type: 'provider/stream', requestId, ...attempt });
  }

  function send() {
    if (!selection || !question.trim() || isStreaming || isProviderBusy) {
      return;
    }

    const history = [...messages, { role: 'user' as const, content: question.trim() }];
    const attempt = {
      sourceContext: deriveContext(range, contextMode, selection.text),
      messages: history,
    };
    setQuestion('');
    startAttempt(attempt, [...history, { role: 'assistant', content: '' }]);
  }

  function retry() {
    const previousAttempt = lastAttemptRef.current;
    if (!previousAttempt || isStreaming || isProviderBusy) {
      return;
    }

    startAttempt(previousAttempt, [...messages, { role: 'assistant', content: '' }]);
  }

  function pinCurrent() {
    if (!selection || !range) {
      return;
    }
    const initialPosition = position ?? positionCard(selection.rect, INITIAL_CARD_SIZE, { width: window.innerWidth, height: window.innerHeight });
    const noteId = crypto.randomUUID();
    const note: PinnedNote = {
      id: noteId,
      selection,
      range,
      anchor: createTextAnchor(range, selection.text),
      detached: false,
      messages,
      contextMode,
      offset: { x: initialPosition.left - selection.rect.left, y: initialPosition.top - selection.rect.top },
      collapsed: false,
      behavior: 'auto',
      isStreaming,
      error,
      lastAttempt: lastAttemptRef.current,
    };
    setPinnedNotes((notes) => [...notes, note]);
    if (activeRequestIdRef.current) {
      activePinnedNoteIdRef.current = noteId;
    }
    clearSelection();
    setMessages([]);
    setError(undefined);
    setIsStreaming(false);
  }

  function sendPinned(noteId: string, questionToSend: string) {
    if (activeRequestIdRef.current) {
      return;
    }
    const note = pinnedNotes.find((candidate) => candidate.id === noteId);
    if (!note) {
      return;
    }
    const history = [...note.messages, { role: 'user' as const, content: questionToSend }];
    startAttempt({
      sourceContext: deriveContext(note.range, note.contextMode, note.selection.text),
      messages: history,
    }, [...history, { role: 'assistant', content: '' }], noteId);
  }

  function stopPinned(noteId: string) {
    if (activePinnedNoteIdRef.current === noteId) {
      stop();
    }
  }

  function retryPinned(noteId: string) {
    if (activeRequestIdRef.current) {
      return;
    }
    const note = pinnedNotes.find((candidate) => candidate.id === noteId);
    if (!note?.lastAttempt) {
      return;
    }
    startAttempt(note.lastAttempt, [...note.messages, { role: 'assistant', content: '' }], noteId);
  }

  function updatePinnedNote(noteId: string, update: (note: PinnedNote) => PinnedNote) {
    setPinnedNotes((notes) => notes.map((note) => note.id === noteId ? update(note) : note));
  }

  function deletePinnedNote(noteId: string) {
    const note = pinnedNotes.find((candidate) => candidate.id === noteId);
    if (!note) {
      return;
    }
    if (activePinnedNoteIdRef.current === noteId) {
      stop();
    }
    setPinnedNotes((notes) => notes.filter((candidate) => candidate.id !== noteId));
    setDeletedNote(note);
  }

  function reselectPinnedNote(noteId: string) {
    reselectingNoteIdRef.current = noteId;
  }

  function stop() {
    const requestId = activeRequestIdRef.current;
    if (requestId) {
      clientRef.current?.cancel(requestId);
    }
  }

  function resizeComposer() {
    const textarea = inputRef.current;
    if (!textarea) {
      return;
    }
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 88)}px`;
  }

  return (
    <div className="annotation-layer" ref={layerRef}>
      {selection?.rects.map((rect, index) => (
        <div
          className="source-highlight"
          key={`${rect.left}-${rect.top}-${index}`}
          style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
        />
      ))}
      {pinnedNotes.flatMap((note) => note.selection.rects.map((rect, index) => (
        <div
          className="source-highlight"
          key={`${note.id}-${rect.left}-${rect.top}-${index}`}
          style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
        />
      )))}

      {pinnedNotes.map((note) => (
        <PinnedNoteCard
          collisionOffset={collisionOffsets[note.id] ?? { x: 0, y: 0 }}
          key={note.id}
          note={note}
          onCollapse={(noteId, collapsed) => updatePinnedNote(noteId, (current) => ({
            ...current,
            behavior: collapsed ? 'manual-collapsed' : 'manual-open',
            collapsed,
          }))}
          onDelete={deletePinnedNote}
          onDrag={(noteId, offset) => updatePinnedNote(noteId, (current) => ({ ...current, behavior: 'manual-open', collapsed: false, offset }))}
          onReselect={reselectPinnedNote}
          onResize={(noteId, dimensions) => updatePinnedNote(noteId, (current) => ({ ...current, dimensions }))}
          onRetry={retryPinned}
          onSend={sendPinned}
          onStop={stopPinned}
        />
      ))}

      {deletedNote && (
        <div className="undo-toast" role="status">
          Note deleted.
          <button onClick={() => {
            setPinnedNotes((notes) => [...notes, deletedNote]);
            setDeletedNote(undefined);
          }} type="button">Undo</button>
        </div>
      )}

      <nav aria-label="Annotation controls" className="annotation-toolbar">
        <button
          aria-label={enabled ? 'Disable selection AI' : 'Enable selection AI'}
          className={enabled ? 'is-active' : ''}
          onClick={() => {
            setEnabled(!enabled);
            if (enabled) {
              clearSelection();
            }
          }}
          title={enabled ? 'Disable selection AI' : 'Enable selection AI'}
          type="button"
        >
          <Power size={18} strokeWidth={2} />
        </button>
        <button aria-label="Open all notes" disabled={pinnedNotes.length === 0} onClick={() => setPinnedNotes((notes) => notes.map((note) => ({ ...note, behavior: 'manual-open', collapsed: false })))} title="Open all notes" type="button">
          <PanelTopOpen size={18} />
        </button>
        <button aria-label="Collapse all notes" disabled={pinnedNotes.length === 0} onClick={() => setPinnedNotes((notes) => notes.map((note) => ({ ...note, behavior: 'manual-collapsed', collapsed: true })))} title="Collapse all notes" type="button">
          <PanelTopClose size={18} />
        </button>
        <button aria-label="Export notes" disabled={pinnedNotes.length === 0} onClick={() => setExportOpen(true)} title="Export notes" type="button">
          <Download size={18} />
        </button>
        <button aria-label="OpenAI configuration" onClick={() => setConfigurationOpen((open) => !open)} title="OpenAI configuration" type="button">
          <Settings2 size={18} />
        </button>
        <button aria-expanded={moreOpen} aria-label="More annotation actions" onClick={() => setMoreOpen((open) => !open)} title="More actions" type="button">
          <MoreHorizontal size={18} />
        </button>
        {moreOpen && (
          <div className="toolbar-menu" role="menu">
            <button disabled={pinnedNotes.length === 0} onClick={() => { setPinnedNotes([]); setMoreOpen(false); }} role="menuitem" type="button">
              <Trash2 aria-hidden="true" size={14} /> Clear page notes
            </button>
          </div>
        )}
      </nav>

      {configurationOpen && (
        <div className="toolbar-config">
          <ApiKeyConfiguration />
        </div>
      )}

      {exportOpen && <ExportPanel notes={pinnedNotes} onClose={() => setExportOpen(false)} />}

      {selection && position && (
        <motion.div
          animate={{ left: position.left, opacity: 1, top: position.top }}
          className={`chat-card ${messages.length > 0 ? 'is-expanded' : ''}`}
          initial={{ opacity: 0, scale: 0.98, y: 3 }}
          layout
          ref={cardRef}
          style={{ position: 'fixed' }}
          transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
        >
          <button aria-label="Pin conversation" className="pin-button" onClick={pinCurrent} type="button">
            <Pin aria-hidden="true" size={17} />
          </button>
          {messages.length > 0 && (
            <div className="chat-body" aria-live="polite">
              {messages.map((message, index) => message.content && (
                <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}>
                  {message.role === 'assistant' ? <MarkdownResponse content={message.content} /> : message.content}
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="chat-error" role="alert">
              <span>{error}</span>
              <button className="retry-button" onClick={retry} type="button">
                <RotateCcw aria-hidden="true" size={13} /> Retry
              </button>
            </div>
          )}

          <div className="chat-composer">
            <textarea
              aria-label="Ask about selected text"
              onChange={(event) => {
                setQuestion(event.target.value);
                requestAnimationFrame(resizeComposer);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  send();
                }
              }}
              placeholder="Ask anything..."
              ref={inputRef}
              rows={1}
              value={question}
            />
            <label className="context-chip">
              <select aria-label="Context" onChange={(event) => setContextMode(event.target.value as ContextMode)} value={contextMode}>
                <option value="selection">Selection</option>
                <option value="paragraph">Paragraph</option>
                <option value="section">Section</option>
                <option value="page">Page</option>
              </select>
              <ChevronDown aria-hidden="true" size={14} />
            </label>
            <button
              aria-label={isStreaming ? 'Stop generating' : 'Send question'}
              className="send-button"
              disabled={!isStreaming && (!question.trim() || isProviderBusy)}
              onClick={isStreaming ? stop : send}
              type="button"
            >
              {isStreaming ? <Square fill="currentColor" size={15} /> : <SendHorizontal size={18} />}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function appendAssistantDelta(messages: ChatMessage[], delta: string) {
  const last = messages.at(-1);
  if (!last || last.role !== 'assistant') {
    return messages;
  }
  return [...messages.slice(0, -1), { ...last, content: last.content + delta }];
}

function deriveContext(range: Range | undefined, mode: ContextMode, selectedText: string) {
  if (!range || mode === 'selection') {
    return selectedText;
  }

  if (mode === 'page') {
    return document.body.innerText;
  }

  const node = range.commonAncestorContainer;
  const element = node.nodeType === Node.ELEMENT_NODE ? node as Element : node.parentElement;
  const selector = mode === 'paragraph'
    ? 'p, li, blockquote, td, th, pre'
    : 'section, article, main';
  return element?.closest(selector)?.textContent?.trim() || selectedText;
}

function sameRect(left: { left: number; top: number; right: number; bottom: number }, right: { left: number; top: number; right: number; bottom: number }) {
  return left.left === right.left && left.top === right.top && left.right === right.right && left.bottom === right.bottom;
}

function rangeStillMatches(range: Range, selectedText: string) {
  return range.commonAncestorContainer.isConnected && range.toString().trim() === selectedText;
}

function storeNote(note: PinnedNote): StoredNote {
  return {
    id: note.id,
    anchor: note.anchor,
    messages: note.messages,
    contextMode: note.contextMode,
    offset: note.offset,
    dimensions: note.dimensions,
    collapsed: note.collapsed,
    behavior: note.behavior,
  };
}

function restoreNote(note: StoredNote): PinnedNote {
  const range = reanchorText(note.anchor);
  const selection = range ? snapshotFromRange(range) : {
    text: note.anchor.selectedText,
    rect: { left: 16, top: 80, right: 16, bottom: 80, width: 0, height: 0 },
    rects: [],
  };
  return {
    ...note,
    range,
    selection,
    detached: !range,
    isStreaming: false,
  };
}
