import type { ChatMessage } from '../providers/provider';

export interface ExportableNote {
  id: string;
  sourceText: string;
  messages: ChatMessage[];
}

export type LocalExportMode = 'knowledge-points' | 'raw-qa';

export function formatLocalExport(
  notes: ExportableNote[],
  mode: LocalExportMode,
  page: { title: string; url: string },
) {
  const body = notes.map((note, index) => mode === 'knowledge-points'
    ? formatKnowledgePoint(note, index + 1)
    : formatRawQuestionAnswer(note, index + 1)).join('\n\n---\n\n');
  return `# ${mode === 'knowledge-points' ? 'Knowledge Points' : 'Raw Q&A'}\n\nSource: [${page.title || page.url}](${page.url})\n\n${body}\n`;
}

function formatKnowledgePoint(note: ExportableNote, index: number) {
  const question = firstQuestion(note.messages);
  const answer = assistantAnswers(note.messages);
  return `## ${index}. ${question || 'Selected source'}\n\n${answer || '_No response yet._'}\n\n> Source: ${note.sourceText}`;
}

function formatRawQuestionAnswer(note: ExportableNote, index: number) {
  const pairs = note.messages.reduce<Array<{ question: string; answer: string }>>((result, message) => {
    if (message.role === 'user') {
      result.push({ question: message.content, answer: '' });
    } else if (result.length > 0) {
      result[result.length - 1]!.answer += message.content;
    }
    return result;
  }, []);
  const conversation = pairs.length > 0
    ? pairs.map((pair) => `### Q: ${pair.question}\n\n${pair.answer || '_No response yet._'}`).join('\n\n')
    : '_No questions yet._';
  return `## ${index}. Source\n\n> ${note.sourceText}\n\n${conversation}`;
}

function firstQuestion(messages: ChatMessage[]) {
  return messages.find((message) => message.role === 'user')?.content;
}

function assistantAnswers(messages: ChatMessage[]) {
  return messages.filter((message) => message.role === 'assistant').map((message) => message.content).filter(Boolean).join('\n\n');
}

export function structuredStudyPrompt(notes: ExportableNote[]) {
  const material = notes.map((note, index) => {
    const conversation = note.messages.map((message) => `${message.role}: ${message.content}`).join('\n');
    return `Note ${index + 1}\nSource: ${note.sourceText}\n${conversation}`;
  }).join('\n\n---\n\n');
  return `Create concise structured study notes from the reader's questions and answers below. Group related ideas, preserve factual meaning, retain each source association, and avoid turning this into a generic page summary. Return Markdown only.\n\n${material}`;
}
