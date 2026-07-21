import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, Hash, Zap } from 'lucide-react';
import TypingIndicator from './TypingIndicator';
import { copyToClipboard } from '../lib/clipboard';

// AI 답변을 GPT/제미나이처럼 마크다운으로 렌더링한다. 코드 스타일은 code 컴포넌트
// 하나로 인라인/블록을 다 처리하고, pre 안에서는 [&>code]로 이중 배경/패딩을 지운다.
const markdownComponents = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="underline underline-offset-2 hover:text-primary"
    >
      {children}
    </a>
  ),
  h1: ({ children }) => <h3 className="mb-2 mt-1 text-base font-semibold first:mt-0">{children}</h3>,
  h2: ({ children }) => <h3 className="mb-2 mt-1 text-base font-semibold first:mt-0">{children}</h3>,
  h3: ({ children }) => <h4 className="mb-1 mt-1 text-sm font-semibold first:mt-0">{children}</h4>,
  blockquote: ({ children }) => (
    <blockquote className="mb-2 border-l-2 border-border/50 pl-3 italic text-muted-foreground last:mb-0">
      {children}
    </blockquote>
  ),
  code: ({ children, ...props }) => (
    <code className="rounded bg-foreground/10 px-1 py-0.5 font-mono text-[0.85em]" {...props}>
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="mb-2 overflow-x-auto rounded-lg bg-foreground/5 p-3 font-mono text-xs [&>code]:bg-transparent [&>code]:p-0 last:mb-0">
      {children}
    </pre>
  ),
};

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await copyToClipboard(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 접근 실패 시 조용히 무시
    }
  };

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      <div
        className={`max-w-[75%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser ? 'whitespace-pre-wrap' : ''
        } ${
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-card text-card-foreground border border-border/30'
        }`}
      >
        {isUser ? (
          message.content
        ) : message.content ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {message.content}
          </ReactMarkdown>
        ) : (
          <TypingIndicator />
        )}

        {message.sources?.length > 0 && (
          <div className="mt-2 border-t border-border/30 pt-2 text-xs text-muted-foreground">
            출처:{' '}
            {message.sources
              .map((s) => (s.page != null ? `${s.source} p.${s.page}` : s.source))
              .join(', ')}
          </div>
        )}
      </div>

      {message.content && (
        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:text-foreground"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? '복사됨' : '복사'}
          </button>

          {message.stats && (
            <>
              <span className="flex items-center gap-1">
                <Hash size={12} />
                {message.stats.tokens} tokens
              </span>
              <span className="flex items-center gap-1">
                <Zap size={12} />
                {message.stats.tokens_per_second} tokens/s
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
