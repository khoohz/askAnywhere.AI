import { Check, Clipboard, Download, SendHorizontal, Square, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { formatLocalExport, structuredStudyPrompt, type LocalExportMode } from '../export/format';
import { createProviderStreamClient } from '../content/provider-stream-client';
import type { ProviderPortEvent } from '../messaging/provider-protocol';
import type { PinnedNote } from '../notes/note';

interface ExportPanelProps {
  notes: PinnedNote[];
  onClose(): void;
}

export function ExportPanel({ notes, onClose }: ExportPanelProps) {
  const [selectedIds, setSelectedIds] = useState(() => new Set(notes.map((note) => note.id)));
  const [mode, setMode] = useState<LocalExportMode | 'structured-study'>('knowledge-points');
  const [copied, setCopied] = useState(false);
  const [studyOutput, setStudyOutput] = useState('');
  const [studyError, setStudyError] = useState<string>();
  const [isGenerating, setIsGenerating] = useState(false);
  const requestIdRef = useRef<string | undefined>(undefined);
  const clientRef = useRef<ReturnType<typeof createProviderStreamClient> | undefined>(undefined);
  const selectedNotes = useMemo(() => notes.filter((note) => selectedIds.has(note.id)), [notes, selectedIds]);
  const localOutput = formatLocalExport(
    selectedNotes.map((note) => ({ id: note.id, sourceText: note.selection.text, messages: note.messages })),
    mode === 'structured-study' ? 'knowledge-points' : mode,
    { title: document.title, url: window.location.href },
  );
  const output = mode === 'structured-study' ? studyOutput : localOutput;

  useEffect(() => {
    const client = createProviderStreamClient((event) => handleStreamEvent(event));
    clientRef.current = client;
    return () => client.disconnect();

    function handleStreamEvent(event: ProviderPortEvent) {
      if (event.requestId !== requestIdRef.current) {
        return;
      }
      if (event.type === 'provider/delta') {
        setStudyOutput((current) => current + event.text);
      }
      if (event.type === 'provider/error') {
        setStudyError(event.message);
      }
      if (event.type !== 'provider/delta') {
        setIsGenerating(false);
        requestIdRef.current = undefined;
      }
    }
  }, []);

  function toggle(noteId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(noteId)) {
        next.delete(noteId);
      } else {
        next.add(noteId);
      }
      return next;
    });
  }

  async function copy() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  }

  function generateStructuredStudy() {
    if (selectedNotes.length === 0 || isGenerating) {
      return;
    }
    const requestId = crypto.randomUUID();
    requestIdRef.current = requestId;
    setStudyError(undefined);
    setStudyOutput('');
    setIsGenerating(true);
    clientRef.current?.start({
      type: 'provider/stream',
      requestId,
      sourceContext: selectedNotes.map((note) => note.selection.text).join('\n\n'),
      messages: [{ role: 'user', content: structuredStudyPrompt(selectedNotes.map((note) => ({ id: note.id, sourceText: note.selection.text, messages: note.messages }))) }],
    });
  }

  function stopStructuredStudy() {
    const requestId = requestIdRef.current;
    if (requestId) {
      clientRef.current?.cancel(requestId);
    }
  }

  function download() {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([output], { type: 'text/markdown;charset=utf-8' }));
    link.download = `${mode}.md`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 0);
  }

  return (
    <section aria-label="Export notes" className="export-panel">
      <header>
        <div>
          <p className="panel-eyebrow">Pinned notes</p>
          <h2>Export</h2>
        </div>
        <button aria-label="Close export" className="panel-close" onClick={onClose} type="button"><X size={18} /></button>
      </header>
      <div className="export-mode" role="radiogroup" aria-label="Export format">
        <label><input checked={mode === 'knowledge-points'} name="export-mode" onChange={() => setMode('knowledge-points')} type="radio" /> Knowledge Points</label>
        <label><input checked={mode === 'raw-qa'} name="export-mode" onChange={() => setMode('raw-qa')} type="radio" /> Raw Q&A</label>
        <label><input checked={mode === 'structured-study'} name="export-mode" onChange={() => setMode('structured-study')} type="radio" /> Structured Study Notes</label>
      </div>
      <div className="export-note-list">
        {notes.map((note) => (
          <label className="export-note-option" key={note.id}>
            <input checked={selectedIds.has(note.id)} onChange={() => toggle(note.id)} type="checkbox" />
            <span>{note.messages.find((message) => message.role === 'user')?.content || note.selection.text}</span>
          </label>
        ))}
      </div>
      {mode === 'structured-study' && (
        <>
          <button className="generate-study" disabled={selectedNotes.length === 0} onClick={isGenerating ? stopStructuredStudy : generateStructuredStudy} type="button">
            {isGenerating ? <Square aria-hidden="true" fill="currentColor" size={14} /> : <SendHorizontal aria-hidden="true" size={16} />}
            {isGenerating ? 'Stop' : studyOutput ? 'Generate again' : 'Generate'}
          </button>
          {studyError && <p className="study-error" role="alert">{studyError}</p>}
          {studyOutput && <pre className="study-preview">{studyOutput}</pre>}
        </>
      )}
      <footer>
        <button className="export-secondary" disabled={selectedNotes.length === 0 || !output} onClick={() => void copy()} type="button">
          {copied ? <Check aria-hidden="true" size={16} /> : <Clipboard aria-hidden="true" size={16} />} {copied ? 'Copied' : 'Copy'}
        </button>
        <button disabled={selectedNotes.length === 0 || !output} onClick={download} type="button">
          <Download aria-hidden="true" size={16} /> Download
        </button>
      </footer>
    </section>
  );
}
