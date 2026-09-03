import { createOpenAIApiKeyStorage } from '../src/config/openai-api-key-storage';
import {
  createProviderPortController,
  isProviderPortRequest,
} from '../src/background/provider-port-controller';
import { OpenAIDirectProvider } from '../src/providers/openai-direct-provider';
import { isNoteSessionRequest } from '../src/messaging/note-session-protocol';
import { createNoteSessionStore } from '../src/notes/session-note-storage';

export default defineBackground(() => {
  const apiKeyStorage = createOpenAIApiKeyStorage();
  const provider = new OpenAIDirectProvider({
    apiKey: () => apiKeyStorage.get(),
    model: 'gpt-4.1-mini',
  });
  const noteSessionStore = createNoteSessionStore(browser.storage.session);

  browser.runtime.onMessage.addListener((message, sender) => {
    if (!isNoteSessionRequest(message) || sender.tab?.id === undefined) {
      return undefined;
    }

    if (message.type === 'notes/load') {
      return noteSessionStore.load(sender.tab.id, message.url);
    }

    return noteSessionStore.save(sender.tab.id, message.url, message.notes);
  });

  browser.runtime.onConnect.addListener((port) => {
    if (port.name !== 'ai-web-annotation/provider-stream') {
      return;
    }

    const controller = createProviderPortController(port, provider);
    port.onMessage.addListener((message) => {
      if (!isProviderPortRequest(message)) {
        return;
      }

      if (message.type === 'provider/cancel') {
        controller.cancel(message.requestId);
        return;
      }

      void controller.start(message);
    });
  });
});
