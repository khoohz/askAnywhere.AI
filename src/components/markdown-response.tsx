import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { codeLanguageFromClassName } from './code-language';
import { highlightCode } from './shiki-worker-client';

export function MarkdownResponse({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        a: ({ children, ...props }) => <a {...props} rel="noreferrer" target="_blank">{children}</a>,
        code: ({ children, className, ...props }) => {
          const language = codeLanguageFromClassName(className);
          const code = String(children).replace(/\n$/, '');

          if (language) {
            return <CodeBlock code={code} language={language} />;
          }

          return <code className={className} {...props}>{children}</code>;
        },
        pre: ({ children }) => <>{children}</>,
      }}
      remarkPlugins={[remarkGfm]}
    >
      {content}
    </ReactMarkdown>
  );
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);
  const [highlightedHtml, setHighlightedHtml] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    setHighlightedHtml(undefined);
    void highlightCode(code, language).then((html) => {
      if (!cancelled) {
        setHighlightedHtml(html);
      }
    }).catch(() => {
      // Unknown languages retain a safe, selectable plain-code fallback.
    });
    return () => {
      cancelled = true;
    };
  }, [code, language]);

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  }

  return (
    <div className="code-block">
      <div className="code-block-heading">
        <span>{language}</span>
        <button aria-label="Copy code" className="copy-code-button" onClick={() => void copyCode()} type="button">
          {copied ? <Check aria-hidden="true" size={14} /> : <Copy aria-hidden="true" size={14} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      {highlightedHtml
        ? <div className="shiki-code" dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
        : <pre><code>{code}</code></pre>}
    </div>
  );
}
