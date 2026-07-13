import { useEffect, useRef, useState } from 'react';
import { Send, Paperclip, Loader2 } from 'lucide-react';
import MessageBubble from './MessageBubble';
import ModelBadge from './ModelBadge';
import { uploadDocument } from '../lib/api';

const MAX_HISTORY = 5;

export default function ChatWindow({ session, isLoading, onSend, onDocumentUploaded }) {
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const hasMessages = Boolean(session && session.messages.length > 0);

  const historyRef = useRef([]); // 최근 입력이 앞에 오도록, 최대 5개
  const historyIndexRef = useRef(-1); // -1 = 히스토리 탐색 중 아님
  const draftRef = useRef(''); // 히스토리 탐색 시작 전 입력하던 내용

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [session?.messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const question = input.trim();
    if (!question || isLoading) return;
    setInput('');
    historyRef.current = [question, ...historyRef.current].slice(0, MAX_HISTORY);
    historyIndexRef.current = -1;
    onSend(question);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSubmit(e);
      return;
    }

    const history = historyRef.current;
    if (e.key === 'ArrowUp') {
      const cursorAtStart = !e.target.value.slice(0, e.target.selectionStart).includes('\n');
      if (!cursorAtStart || history.length === 0) return;
      e.preventDefault();
      if (historyIndexRef.current === -1) draftRef.current = input;
      historyIndexRef.current = Math.min(historyIndexRef.current + 1, history.length - 1);
      setInput(history[historyIndexRef.current]);
    } else if (e.key === 'ArrowDown') {
      const cursorAtEnd = !e.target.value.slice(e.target.selectionStart).includes('\n');
      if (!cursorAtEnd || historyIndexRef.current === -1) return;
      e.preventDefault();
      historyIndexRef.current -= 1;
      setInput(historyIndexRef.current === -1 ? draftRef.current : history[historyIndexRef.current]);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    try {
      await uploadDocument(file);
      await onDocumentUploaded?.();
    } catch (err) {
      setUploadError(err.message);
      setTimeout(() => setUploadError(null), 4000);
    } finally {
      setUploading(false);
    }
  };

  const inputBar = (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 rounded-[2rem] border border-border/30 bg-muted/60 px-5 py-3">
      <textarea
        value={input}
        onChange={(e) => {
          historyIndexRef.current = -1;
          setInput(e.target.value);
        }}
        onKeyDown={handleKeyDown}
        placeholder="질문을 입력하세요..."
        rows={3}
        className="w-full resize-none bg-transparent text-base outline-none placeholder:text-muted-foreground"
      />
      {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            title="문서 업로드"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-50 transition-colors"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx"
            className="hidden"
            onChange={handleFileChange}
          />
          <ModelBadge />
        </div>
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-40 transition-opacity"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-full flex-1 flex-col bg-background">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto flex min-h-full max-w-5xl flex-col gap-8">
          <div
            className="transition-[flex-grow] duration-500 ease-in-out"
            style={{ flexGrow: hasMessages ? 0 : 1 }}
          />

          {!hasMessages && (
            <p className="text-center text-xl text-muted-foreground transition-opacity duration-300">
              업로드한 문서에 대해 질문해보세요!
            </p>
          )}

          {session?.messages.map((message, i) => (
            <MessageBubble key={i} message={message} />
          ))}

          <form onSubmit={handleSubmit}>{inputBar}</form>

          <div
            className="transition-[flex-grow] duration-500 ease-in-out"
            style={{ flexGrow: hasMessages ? 0 : 1 }}
          />
        </div>
      </div>
    </div>
  );
}
