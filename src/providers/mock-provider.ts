import type { LLMProvider, ProviderStreamInput, ProviderStreamEvent } from './provider';

/** A local-only provider used to validate extension streaming mechanics. */
export class MockProvider implements LLMProvider {
  readonly id = 'mock';

  async isAvailable() {
    return true;
  }

  async *streamMessage(input: ProviderStreamInput): AsyncIterable<ProviderStreamEvent> {
    input.signal?.throwIfAborted();

    yield { type: 'delta', text: 'Provider-session feasibility is blocked pending provider authorization.' };
    yield { type: 'complete' };
  }
}
