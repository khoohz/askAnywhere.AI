import type { LLMProvider } from '../providers/provider';
import type { ProviderPortEvent, ProviderStreamRequest } from '../messaging/provider-protocol';

/**
 * Converts one host-page stream request into ordered, provider-neutral events.
 * It is deliberately independent from Chrome APIs so it is the tested boundary.
 */
export function createProviderMessageHandler(provider: LLMProvider) {
  return async function handle(
    request: ProviderStreamRequest,
    signal?: AbortSignal,
    onEvent?: (event: ProviderPortEvent) => void,
  ): Promise<ProviderPortEvent[]> {
    const events: ProviderPortEvent[] = [];
    const emit = (event: ProviderPortEvent) => {
      events.push(event);
      onEvent?.(event);
    };

    try {
      for await (const event of provider.streamMessage({
        sourceContext: request.sourceContext,
        messages: request.messages,
        signal,
      })) {
        if (event.type === 'delta') {
          emit({
            type: 'provider/delta',
            requestId: request.requestId,
            text: event.text,
          });
        }
      }
    } catch (error) {
      if (isAbortError(error, signal)) {
        emit({ type: 'provider/stopped', requestId: request.requestId });
        return events;
      }

      emit({
        type: 'provider/error',
        requestId: request.requestId,
        message: error instanceof Error ? error.message : 'Provider stream failed.',
      });
      return events;
    }

    if (signal?.aborted) {
      emit({ type: 'provider/stopped', requestId: request.requestId });
      return events;
    }

    emit({ type: 'provider/complete', requestId: request.requestId });
    return events;
  };
}

function isAbortError(error: unknown, signal?: AbortSignal) {
  return signal?.aborted || (error instanceof DOMException && error.name === 'AbortError');
}
