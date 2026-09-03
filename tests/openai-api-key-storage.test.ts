import { describe, expect, it } from 'vitest';

import {
  OpenAIApiKeyStorage,
  type LocalStorageArea,
} from '../src/config/openai-api-key-storage';

describe('OpenAIApiKeyStorage', () => {
  it('stores a supplied key locally and can remove it', async () => {
    const local = createMemoryStorage();
    const storage = new OpenAIApiKeyStorage(local);

    await storage.set('  sk-local-prototype  ');

    await expect(storage.get()).resolves.toBe('sk-local-prototype');
    await expect(storage.isConfigured()).resolves.toBe(true);

    await storage.remove();

    await expect(storage.get()).resolves.toBeUndefined();
    await expect(storage.isConfigured()).resolves.toBe(false);
  });

  it('does not retain an empty key', async () => {
    const storage = new OpenAIApiKeyStorage(createMemoryStorage());

    await storage.set('   ');

    await expect(storage.get()).resolves.toBeUndefined();
  });
});

function createMemoryStorage(): LocalStorageArea {
  const values = new Map<string, unknown>();

  return {
    async get(key) {
      return { [key]: values.get(key) };
    },
    async set(value) {
      for (const [key, storedValue] of Object.entries(value)) {
        values.set(key, storedValue);
      }
    },
    async remove(key) {
      values.delete(key);
    },
  };
}
