interface HighlightRequest {
  code: string;
  id: string;
  language: string;
}

interface HighlightResponse {
  html?: string;
  id: string;
}

let worker: Worker | undefined;
const pendingRequests = new Map<string, { reject(error: Error): void; resolve(html: string | undefined): void }>();

function getWorker() {
  if (worker) {
    return worker;
  }
  const nextWorker = new Worker(chrome.runtime.getURL('/shiki-worker.js'), { type: 'module' });
  nextWorker.addEventListener('message', (event: MessageEvent<HighlightResponse>) => {
    const request = pendingRequests.get(event.data.id);
    if (!request) {
      return;
    }
    pendingRequests.delete(event.data.id);
    request.resolve(event.data.html);
  });
  nextWorker.addEventListener('error', (event) => {
    const error = new Error(event.message || 'Unable to load the code renderer.');
    pendingRequests.forEach(({ reject }) => reject(error));
    pendingRequests.clear();
    worker?.terminate();
    worker = undefined;
  });
  worker = nextWorker;
  return nextWorker;
}

export function highlightCode(code: string, language: string) {
  return new Promise<string | undefined>((resolve, reject) => {
    const id = crypto.randomUUID();
    pendingRequests.set(id, { resolve, reject });
    getWorker().postMessage({ code, id, language } satisfies HighlightRequest);
  });
}
