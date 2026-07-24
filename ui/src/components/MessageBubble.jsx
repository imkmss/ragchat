import { useState } from 'react';
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, Hash, Zap, FileText } from 'lucide-react';
import TypingIndicator from './TypingIndicator';
import { copyToClipboard } from '../lib/clipboard';

// 출처 태그([파일명 p.쪽번호] 또는 [파일명])를 가짜 링크(cite:...)로 바꿔서, a 컴포넌트에서
// 버튼 배지로 렌더링할 수 있게 한다. 실제 마크다운 링크(`[text](url)`)와 안 겹치도록
// 파일 확장자가 있는 대괄호 텍스트만 매칭한다.
const CITATION_PATTERN = /\[([^[\]]+\.(?:pdf|docx)(?:\s+p\.\d+)?)\]/gi;

// encodeURIComponent는 ( ) ! * ' 를 인코딩하지 않는데, 파일명에 괄호가 들어있으면
// 마크다운 링크 URL의 괄호 짝이 안 맞아서 링크가 중간에 끊기고 나머지가 그대로
// 텍스트로 노출된다. 이 문자들까지 전부 퍼센트 인코딩해서 URL에 원본 문자가 안 남게 한다.
function safeCiteEncode(label) {
  return encodeURIComponent(label).replace(/[()!*']/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

// 버튼에는 파일명 대신 고정된 "출처"만 표시하고, 실제 파일명/페이지는 href에 담아서
// 툴팁(title)으로만 보여준다.
function linkifyCitations(text) {
  return text.replace(CITATION_PATTERN, (_, label) => `[출처](cite:${safeCiteEncode(label)})`);
}

// react-markdown은 기본적으로 http(s)/mailto 등 안전한 프로토콜만 href로 통과시키고
// cite: 같은 커스텀 스킴은 빈 문자열로 지워버린다. cite:만 예외로 허용한다.
function urlTransform(url) {
  return url.startsWith('cite:') ? url : defaultUrlTransform(url);
}

// 브라우저 기본 title 속성은 뜨는 데 딜레이가 있어서, 커서 올리자마자 바로 뜨는
// 커스텀 툴팁으로 직접 구현한다.
function CitationBadge({ label, children }) {
  const [hovering, setHovering] = useState(false);
  return (
    <span className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        className="mx-0.5 inline-flex translate-y-[2px] items-center gap-1 rounded-full border border-border/30 bg-muted/60 px-2 py-0.5 align-middle text-[11px] font-normal text-muted-foreground hover:bg-muted"
      >
        <FileText size={10} className="shrink-0" />
        {children}
      </button>
      {hovering && (
        <span className="absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[11px] text-background">
          {label}
        </span>
      )}
    </span>
  );
}

// AI 답변을 GPT/제미나이처럼 마크다운으로 렌더링한다. 코드 스타일은 code 컴포넌트
// 하나로 인라인/블록을 다 처리하고, pre 안에서는 [&>code]로 이중 배경/패딩을 지운다.
const markdownComponents = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  a: ({ children, href }) => {
    if (href?.startsWith('cite:')) {
      return <CitationBadge label={decodeURIComponent(href.slice(5))}>{children}</CitationBadge>;
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="underline underline-offset-2 hover:text-primary"
      >
        {children}
      </a>
    );
  },
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
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents} urlTransform={urlTransform}>
            {linkifyCitations(message.content)}
          </ReactMarkdown>
        ) : (
          <TypingIndicator />
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
