import { describe, expect, it } from 'vitest';

import { createProviderMessageHandler } from '../src/background/provider-message-handler';
import { createProviderPortController } from '../src/background/provider-port-controller';
import type { ProviderPortEvent } from '../src/messaging/provider-protocol';
import type { LLMProvider } from '../src/providers/provider';

describe('provider message boundary', () => {
  it('streams provider deltas and completes the matching request', async () => {
    const provider: LLMProvider = {
      id: 'probe',
      isAvailable: async () => true,
      streamMessage: async function* () {
        yield { type: 'delta', text: 'Hello' };
        yield { type: 'delta', text: ' world' };
      },
    };
    const handler = createProviderMessageHandler(provider);

    const events = await handler({
      type: 'provider/stream',
      requestId: 'request-1',
      sourceContext: 'Selected source text',
      messages: [{ role: 'user', content: 'Explain this.' }],
    });

    expect(events).toEqual([
      { type: 'provider/delta', requestId: 'request-1', text: 'Hello' },
      { type: 'provider/delta', requestId: 'request-1', text: ' world' },
      { type: 'provider/complete', requestId: 'request-1' },
    ]);
  });

  it('reports an aborted stream without converting it into a provider failure', async () => {
    const provider: LLMProvider = {
      id: 'probe',
      isAvailable: async () => true,
      streamMessage: async function* ({ signal }) {
        signal?.throwIfAborted();
        yield { type: 'delta', text: 'Partial' };
      },
    };
    const handler = createProviderMessageHandler(provider);
    const controller = new AbortController();
    controller.abort();

    const events = await handler(
      {
        type: 'provider/stream',
        requestId: 'request-2',
        sourceContext: 'Selected source text',
        messages: [{ role: 'user', content: 'Explain this.' }],
      },
      controller.signal,
    );

    expect(events).toEqual([{ type: 'provider/stopped', requestId: 'request-2' }]);
  });

  it('keeps already-streamed text when a port request is cancelled', async () => {
    let resume: () => void = () => undefined;
    const pause = new Promise<void>((resolve) => {
      resume = resolve;
    });
    const sent: ProviderPortEvent[] = [];
    let disconnected: (() => void) | undefined;
    const provider: LLMProvider = {
      id: 'probe',
      isAvailable: async () => true,
      streamMessage: async function* ({ signal }) {
        yield { type: 'delta', text: 'Partial' };
        await pause;
        signal?.throwIfAborted();
      },
    };
    const controller = createProviderPortController(
      {
        postMessage: (event) => sent.push(event),
        onDisconnect: {
          addListener: (listener) => {
            disconnected = listener;
          },
        },
      },
      provider,
    );

    const running = controller.start({
      type: 'provider/stream',
      requestId: 'request-3',
      sourceContext: 'Selected source text',
      messages: [{ role: 'user', content: 'Explain this.' }],
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(sent).toEqual([
      { type: 'provider/delta', requestId: 'request-3', text: 'Partial' },
    ]);
    controller.cancel('request-3');
    resume();
    await running;
    disconnected?.();

    expect(sent).toEqual([
      { type: 'provider/delta', requestId: 'request-3', text: 'Partial' },
      { type: 'provider/stopped', requestId: 'request-3' },
    ]);
  });
});
