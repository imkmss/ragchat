import { useState } from 'react';
import { Copy, Check, Hash, Zap } from 'lucide-react';
import TypingIndicator from './TypingIndicator';

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 접근 실패 시 조용히 무시
    }
  };

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      <div
        className={`max-w-[75%] rounded-xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-card text-card-foreground border border-border/30'
        }`}
      >
        {message.content || (message.role === 'assistant' && <TypingIndicator />)}

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
