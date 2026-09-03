import { useEffect, useState } from 'react';

import { createOpenAIApiKeyStorage } from '../config/openai-api-key-storage';

const apiKeyStorage = createOpenAIApiKeyStorage();

export function ApiKeyConfiguration() {
  const [apiKey, setApiKey] = useState('');
  const [configured, setConfigured] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void apiKeyStorage.isConfigured().then(setConfigured);
  }, []);

  async function save() {
    setIsSaving(true);
    await apiKeyStorage.set(apiKey);
    setApiKey('');
    setConfigured(await apiKeyStorage.isConfigured());
    setIsSaving(false);
  }

  async function remove() {
    setIsSaving(true);
    await apiKeyStorage.remove();
    setApiKey('');
    setConfigured(false);
    setIsSaving(false);
  }

  return (
    <main className="api-key-configuration">
      <header>
        <p className="eyebrow">AI Web Annotation</p>
        <h1>OpenAI API key</h1>
        <p className="description">Stored locally for this personal prototype. It is never synced.</p>
      </header>

      <label htmlFor="openai-api-key">{configured ? 'Replace local key' : 'Add local key'}</label>
      <input
        id="openai-api-key"
        value={apiKey}
        onChange={(event) => setApiKey(event.target.value)}
        type="password"
        autoComplete="off"
        spellCheck={false}
        placeholder="sk-..."
      />

      <div className="actions">
        <button disabled={isSaving || !apiKey.trim()} onClick={() => void save()} type="button">
          {isSaving ? 'Saving…' : configured ? 'Replace key' : 'Save key'}
        </button>
        {configured && (
          <button className="secondary" disabled={isSaving} onClick={() => void remove()} type="button">
            Remove key
          </button>
        )}
      </div>

      <p className={configured ? 'status configured' : 'status'}>
        {configured ? 'Local key configured' : 'No local key configured'}
      </p>
    </main>
  );
}
