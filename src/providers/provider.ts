export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ProviderStreamInput {
  sourceContext: string;
  messages: ChatMessage[];
  signal?: AbortSignal;
}

export type ProviderStreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'complete' };

/**
 * Provider-neutral contract. A future AskAnywhere backend adapter can replace
 * the local V1 API adapter without changing content-script UI messaging.
 */
export interface LLMProvider {
  id: string;
  isAvailable(): Promise<boolean>;
  streamMessage(input: ProviderStreamInput): AsyncIterable<ProviderStreamEvent>;
}
