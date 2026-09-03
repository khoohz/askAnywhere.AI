import type {
  ProviderPortEvent,
  ProviderStreamRequest,
} from '../messaging/provider-protocol';

/**
 * Provider-neutral content-script boundary. It never knows which adapter
 * services the request or how that adapter stores its configuration.
 */
export function createProviderStreamClient(onEvent: (event: ProviderPortEvent) => void) {
  const port = browser.runtime.connect({ name: 'ai-web-annotation/provider-stream' });
  port.onMessage.addListener(onEvent);

  return {
    start(request: ProviderStreamRequest) {
      port.postMessage(request);
    },
    cancel(requestId: string) {
      port.postMessage({ type: 'provider/cancel', requestId });
    },
    disconnect() {
      port.disconnect();
    },
  };
}
