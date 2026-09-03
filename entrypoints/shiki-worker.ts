import { highlightCode } from '../src/components/shiki-highlighter';

interface HighlightRequest {
  code: string;
  id: string;
  language: string;
}

export default defineUnlistedScript(() => {
  globalThis.addEventListener('message', (event: MessageEvent<HighlightRequest>) => {
    const { code, id, language } = event.data;
    void highlightCode(code, language)
      .then((html) => globalThis.postMessage({ html, id }))
      .catch(() => globalThis.postMessage({ id }));
  });
});
