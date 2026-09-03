import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({ plugins: [tailwindcss()] }),
  manifest: {
    name: 'AI Web Annotation',
    description: 'Ask questions about selected web text with your local OpenAI API key.',
    permissions: ['clipboardWrite', 'storage'],
    host_permissions: ['https://api.openai.com/*'],
    web_accessible_resources: [{
      matches: ['<all_urls>'],
      resources: ['shiki-worker.js'],
      use_dynamic_url: true,
    }],
  },
});
