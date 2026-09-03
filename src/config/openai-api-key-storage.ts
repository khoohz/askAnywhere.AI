const OPENAI_API_KEY_KEY = 'openaiApiKey';

export interface LocalStorageArea {
  get(key: string): Promise<Record<string, unknown>>;
  set(values: Record<string, unknown>): Promise<void>;
  remove(key: string): Promise<void>;
}

/** Local-only storage for the V1 prototype credential. */
export class OpenAIApiKeyStorage {
  constructor(private readonly local: LocalStorageArea) {}

  async get() {
    const values = await this.local.get(OPENAI_API_KEY_KEY);
    const value = values[OPENAI_API_KEY_KEY];
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }

  async set(apiKey: string) {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      await this.remove();
      return;
    }

    await this.local.set({ [OPENAI_API_KEY_KEY]: trimmed });
  }

  async remove() {
    await this.local.remove(OPENAI_API_KEY_KEY);
  }

  async isConfigured() {
    return Boolean(await this.get());
  }
}

export function createOpenAIApiKeyStorage() {
  return new OpenAIApiKeyStorage(browser.storage.local);
}
