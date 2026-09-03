export function codeLanguageFromClassName(className?: string) {
  return /language-(\w+)/.exec(className ?? '')?.[1];
}
