import { createHighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';

const LANGUAGE_LOADERS = {
  bash: () => import('@shikijs/langs/bash'),
  css: () => import('@shikijs/langs/css'),
  html: () => import('@shikijs/langs/html'),
  javascript: () => import('@shikijs/langs/javascript'),
  json: () => import('@shikijs/langs/json'),
  jsx: () => import('@shikijs/langs/jsx'),
  markdown: () => import('@shikijs/langs/markdown'),
  typescript: () => import('@shikijs/langs/typescript'),
  tsx: () => import('@shikijs/langs/tsx'),
  yaml: () => import('@shikijs/langs/yaml'),
};

type SupportedLanguage = keyof typeof LANGUAGE_LOADERS;

const LANGUAGE_ALIASES: Record<string, SupportedLanguage | undefined> = {
  bash: 'bash',
  css: 'css',
  html: 'html',
  javascript: 'javascript',
  js: 'javascript',
  json: 'json',
  jsx: 'jsx',
  markdown: 'markdown',
  md: 'markdown',
  sh: 'bash',
  shell: 'bash',
  ts: 'typescript',
  tsx: 'tsx',
  typescript: 'typescript',
  yaml: 'yaml',
  yml: 'yaml',
};

let highlighterPromise: ReturnType<typeof createHighlighterCore> | undefined;

export async function highlightCode(code: string, language: string) {
  const normalizedLanguage = LANGUAGE_ALIASES[language.toLowerCase()];
  if (!normalizedLanguage) {
    return undefined;
  }

  highlighterPromise ??= createHighlighterCore({
    engine: createJavaScriptRegexEngine({ forgiving: true }),
    langs: [],
    themes: [import('@shikijs/themes/github-light')],
  });
  const highlighter = await highlighterPromise;
  if (!highlighter.getLoadedLanguages().includes(normalizedLanguage)) {
    await highlighter.loadLanguage(LANGUAGE_LOADERS[normalizedLanguage]());
  }
  return highlighter.codeToHtml(code, { lang: normalizedLanguage, theme: 'github-light' });
}
