import { describe, expect, it, vi } from 'vitest';

import { OpenAIDirectProvider } from '../src/providers/openai-direct-provider';
import type { ProviderStreamEvent } from '../src/providers/provider';

describe('OpenAIDirectProvider', () => {
  it('streams output-text deltas from the official Responses API', async () => {
    let requestedUrl: string | undefined;
    let request: RequestInit | undefined;
    const fetchImplementation: typeof fetch = async (input, init) => {
      requestedUrl = String(input);
      request = init;
      return new Response(
      [
        'event: response.output_text.delta\n',
        'data: {"type":"response.output_text.delta","delta":"Hello"}\n\n',
        'event: response.output_text.delta\n',
        'data: {"type":"response.output_text.delta","delta":" world"}\n\n',
        'event: response.completed\n',
        'data: {"type":"response.completed"}\n\n',
      ].join(''),
      { status: 200, headers: { 'content-type': 'text/event-stream' } },
      );
    };
    const provider = new OpenAIDirectProvider({
      apiKey: async () => 'test-key',
      model: 'test-model',
      fetchImplementation,
    });

    const events: ProviderStreamEvent[] = [];
    for await (const event of provider.streamMessage({
      sourceContext: 'MVCC lets readers see a consistent snapshot.',
      messages: [{ role: 'user', content: 'Why does that matter?' }],
    })) {
      events.push(event);
    }

    expect(events).toEqual([
      { type: 'delta', text: 'Hello' },
      { type: 'delta', text: ' world' },
    ]);
    expect(requestedUrl).toBe('https://api.openai.com/v1/responses');
    expect(request).toEqual(expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer test-key' }),
    }));
    if (typeof request?.body !== 'string') {
      throw new Error('Expected JSON request body.');
    }
    expect(JSON.parse(request.body)).toMatchObject({
      model: 'test-model',
      stream: true,
      store: false,
    });
  });

  it('is unavailable without a locally supplied API key', async () => {
    const provider = new OpenAIDirectProvider({
      apiKey: async () => undefined,
      model: 'test-model',
      fetchImplementation: vi.fn(),
    });

    await expect(provider.isAvailable()).resolves.toBe(false);
    await expect(async () => {
      for await (const _event of provider.streamMessage({
        sourceContext: 'Source',
        messages: [{ role: 'user', content: 'Question' }],
      })) {
        // The stream should fail before yielding.
      }
    }).rejects.toMatchObject({ code: 'missing_api_key' });
  });

  it('translates an OpenAI failure event without losing already streamed text', async () => {
    const provider = new OpenAIDirectProvider({
      apiKey: async () => 'test-key',
      model: 'test-model',
      fetchImplementation: vi.fn(async () => new Response(
        [
          'data: {"type":"response.output_text.delta","delta":"Partial"}\n\n',
          'data: {"type":"response.failed","response":{"error":{"message":"Rate limited"}}}\n\n',
        ].join(''),
        { status: 200, headers: { 'content-type': 'text/event-stream' } },
      )),
    });
    const events: ProviderStreamEvent[] = [];

    await expect(async () => {
      for await (const event of provider.streamMessage({
        sourceContext: 'Source',
        messages: [{ role: 'user', content: 'Question' }],
      })) {
        events.push(event);
      }
    }).rejects.toMatchObject({ code: 'provider_error', message: 'Rate limited' });

    expect(events).toEqual([{ type: 'delta', text: 'Partial' }]);
  });

  it('stops an in-flight API stream after preserving its preceding delta', async () => {
    let resume: () => void = () => undefined;
    const pause = new Promise<void>((resolve) => {
      resume = resolve;
    });
    const encoder = new TextEncoder();
    let reads = 0;
    const response = new Response(new ReadableStream({
      async pull(controller) {
        reads += 1;
        if (reads === 1) {
          controller.enqueue(encoder.encode('data: {"type":"response.output_text.delta","delta":"Partial"}\n\n'));
          return;
        }
        await pause;
        controller.enqueue(encoder.encode('data: {"type":"response.output_text.delta","delta":"Ignored"}\n\n'));
        controller.close();
      },
    }));
    const provider = new OpenAIDirectProvider({
      apiKey: async () => 'test-key',
      model: 'test-model',
      fetchImplementation: vi.fn(async () => response),
    });
    const abortController = new AbortController();
    const events: ProviderStreamEvent[] = [];

    await expect(async () => {
      for await (const event of provider.streamMessage({
        sourceContext: 'Source',
        messages: [{ role: 'user', content: 'Question' }],
        signal: abortController.signal,
      })) {
        events.push(event);
        abortController.abort();
        resume();
      }
    }).rejects.toMatchObject({ name: 'AbortError' });

    expect(events).toEqual([{ type: 'delta', text: 'Partial' }]);
  });
});
