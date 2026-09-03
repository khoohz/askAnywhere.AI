import type {
  LLMProvider,
  ProviderStreamEvent,
  ProviderStreamInput,
} from './provider';

const RESPONSES_URL = 'https://api.openai.com/v1/responses';

export interface OpenAIDirectProviderOptions {
  apiKey: () => Promise<string | undefined>;
  model: string;
  fetchImplementation?: typeof fetch;
}

export class OpenAIProviderError extends Error {
  constructor(
    public readonly code: 'missing_api_key' | 'network_error' | 'provider_error' | 'invalid_response',
    message: string,
  ) {
    super(message);
    this.name = 'OpenAIProviderError';
  }
}

/**
 * Personal-prototype adapter for the official OpenAI API. The UI only depends
 * on LLMProvider, so V2 can replace this with an AskAnywhere-backed adapter.
 */
export class OpenAIDirectProvider implements LLMProvider {
  readonly id = 'openai-direct';
  private readonly fetchImplementation: typeof fetch;

  constructor(private readonly options: OpenAIDirectProviderOptions) {
    this.fetchImplementation = options.fetchImplementation ?? fetch;
  }

  async isAvailable() {
    return Boolean((await this.options.apiKey())?.trim());
  }

  async *streamMessage(input: ProviderStreamInput): AsyncIterable<ProviderStreamEvent> {
    const apiKey = (await this.options.apiKey())?.trim();
    if (!apiKey) {
      throw new OpenAIProviderError('missing_api_key', 'Add an OpenAI API key to send a message.');
    }

    let response: Response;
    try {
      response = await this.fetchImplementation(RESPONSES_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createResponseRequest(input, this.options.model)),
        signal: input.signal,
      });
    } catch (error) {
      if (input.signal?.aborted) {
        throw error;
      }
      throw new OpenAIProviderError('network_error', toErrorMessage(error, 'Could not reach OpenAI.'));
    }

    if (!response.ok) {
      throw new OpenAIProviderError('provider_error', await responseErrorMessage(response));
    }

    if (!response.body) {
      throw new OpenAIProviderError('invalid_response', 'OpenAI returned no streaming response.');
    }

    for await (const payload of parseServerSentEvents(response.body, input.signal)) {
      if (payload.type === 'response.output_text.delta' && typeof payload.delta === 'string') {
        yield { type: 'delta', text: payload.delta };
      }

      if (payload.type === 'response.failed') {
        throw new OpenAIProviderError('provider_error', responseEventErrorMessage(payload));
      }

      if (payload.type === 'response.incomplete') {
        throw new OpenAIProviderError('provider_error', 'OpenAI stopped before the response completed.');
      }
    }
  }
}

function createResponseRequest(input: ProviderStreamInput, model: string) {
  return {
    model,
    stream: true,
    store: false,
    instructions: [
      'Answer the reader’s question using the supplied webpage source as context.',
      `Selected source:\n${input.sourceContext}`,
    ].join('\n\n'),
    input: input.messages.map((message) => `${message.role === 'assistant' ? 'Assistant' : 'User'}:\n${message.content}`).join('\n\n'),
  };
}

async function* parseServerSentEvents(body: ReadableStream<Uint8Array>, signal?: AbortSignal) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      signal?.throwIfAborted();
      const { done, value } = await reader.read();
      signal?.throwIfAborted();
      buffer += decoder.decode(value, { stream: !done });

      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = blocks.pop() ?? '';

      for (const block of blocks) {
        signal?.throwIfAborted();
        const payload = parseSseBlock(block);
        if (payload) {
          yield payload;
        }
      }

      if (done) {
        const payload = parseSseBlock(buffer);
        if (payload) {
          yield payload;
        }
        return;
      }
    }
  } finally {
    if (signal?.aborted) {
      await reader.cancel();
    }
    reader.releaseLock();
  }
}

function parseSseBlock(block: string): Record<string, unknown> | undefined {
  const data = block
    .split(/\r?\n/)
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice('data:'.length).trim())
    .join('\n');

  if (!data || data === '[DONE]') {
    return undefined;
  }

  try {
    const parsed: unknown = JSON.parse(data);
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    throw new OpenAIProviderError('invalid_response', 'OpenAI sent an unreadable streaming event.');
  }
}

async function responseErrorMessage(response: Response) {
  try {
    const payload: unknown = await response.json();
    if (isRecord(payload) && isRecord(payload.error) && typeof payload.error.message === 'string') {
      return payload.error.message;
    }
  } catch {
    // Fall back to a stable, user-safe status message.
  }

  return `OpenAI request failed (${response.status}).`;
}

function responseEventErrorMessage(payload: Record<string, unknown>) {
  if (isRecord(payload.response) && isRecord(payload.response.error) && typeof payload.response.error.message === 'string') {
    return payload.response.error.message;
  }
  if (isRecord(payload.error) && typeof payload.error.message === 'string') {
    return payload.error.message;
  }
  return 'OpenAI could not complete the response.';
}

function toErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
