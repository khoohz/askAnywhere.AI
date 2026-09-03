import { access, readFile } from 'node:fs/promises';

const outputRoot = new URL('../.output/chrome-mv3/', import.meta.url);
const contentScript = await readFile(new URL('content-scripts/annotation.js', outputRoot), 'utf8');
const worker = new URL('shiki-worker.js', outputRoot);

await access(worker);
if (contentScript.includes('github-light')) {
  throw new Error('Shiki must remain outside the initial content-script artifact.');
}

const workerSource = await readFile(worker, 'utf8');
if (!workerSource.includes('github-light')) {
  throw new Error('The deferred Shiki worker was not included in the production artifact.');
}
