import { createProviderMessageHandler } from './provider-message-handler';
import type { LLMProvider } from '../providers/provider';
import type {
  ProviderPortEvent,
  ProviderPortRequest,
  ProviderStreamRequest,
} from '../messaging/provider-protocol';

interface ExtensionPort {
  postMessage(message: ProviderPortEvent): void;
  onDisconnect: { addListener(listener: () => void): void };
}

export function isProviderStreamRequest(message: unknown): message is ProviderStreamRequest {
  if (!isRecord(message)) {
    return false;
  }

  return message.type === 'provider/stream'
    && typeof message.requestId === 'string'
    && typeof message.sourceContext === 'string'
    && Array.isArray(message.messages);
}

export function isProviderPortRequest(message: unknown): message is ProviderPortRequest {
  return isProviderStreamRequest(message)
    || (isRecord(message) && message.type === 'provider/cancel' && typeof message.requestId === 'string');
}

export function createProviderPortController(port: ExtensionPort, provider: LLMProvider) {
  const activeRequests = new Map<string, AbortController>();
  const handle = createProviderMessageHandler(provider);

  port.onDisconnect.addListener(() => {
    for (const controller of activeRequests.values()) {
      controller.abort();
    }
    activeRequests.clear();
  });

  return {
    async start(request: ProviderStreamRequest) {
      activeRequests.get(request.requestId)?.abort();
      const controller = new AbortController();
      activeRequests.set(request.requestId, controller);

      await handle(request, controller.signal, (event) => {
        if (activeRequests.get(request.requestId) === controller) {
          port.postMessage(event);
        }
      });

      if (activeRequests.get(request.requestId) === controller) {
        activeRequests.delete(request.requestId);
      }
    },
    cancel(requestId: string) {
      activeRequests.get(requestId)?.abort();
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
