import { useEffect, useRef, useState } from 'react';
import { Send, Paperclip, Loader2, FileUp, X, FileText, Folder } from 'lucide-react';
import MessageBubble from './MessageBubble';
import ModelBadge from './ModelBadge';
import { uploadDocument } from '../lib/api';

const MAX_HISTORY = 5;
const ACCEPTED_EXTENSIONS = ['.pdf', '.docx'];

export default function ChatWindow({
  session,
  projects,
  currentProjectId,
  isLoading,
  onSend,
  onDocumentUploaded,
  onUploadingChange,
}) {
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);
  const dockRef = useRef(null);
  const fileInputRef = useRef(null);
  const dragCounterRef = useRef(0);
  const [attachedFile, setAttachedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [dockHeight, setDockHeight] = useState(0);
  const hasMessages = Boolean(session && session.messages.length > 0);
  // session?.projectId가 아니라 currentProjectId를 써야, 세션이 아직 안 만들어진
  // "새 채팅 대기" 상태(프로젝트의 + 버튼으로 시작한 경우)에서도 프로젝트를 올바르게 인식한다.
  const project = projects?.find((p) => p.id === currentProjectId);

  const historyRef = useRef([]); // 최근 입력이 앞에 오도록, 최대 5개
  const historyIndexRef = useRef(-1); // -1 = 히스토리 탐색 중 아님
  const draftRef = useRef(''); // 히스토리 탐색 시작 전 입력하던 내용

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [session?.messages]);

  // inputBar는 스크롤 영역 위에 떠 있는 오버레이라, 실제 높이만큼 스크롤 콘텐츠 하단에
  // 여백을 줘야 메시지를 끝까지 내렸을 때 마지막 줄이 입력창 뒤에 가려지지 않는다.
  // 첨부파일/에러 메시지 유무에 따라 오버레이 높이가 바뀌므로 ResizeObserver로 실측한다.
  useEffect(() => {
    const el = dockRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setDockHeight(entry.contentRect.height));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const attachFile = (file) => {
    if (!file) return;
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setUploadError(`지원하지 않는 파일 형식: ${ext}`);
      setTimeout(() => setUploadError(null), 4000);
      return;
    }
    setUploadError(null);
    setAttachedFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const question = input.trim();
    if (!question || isLoading || uploading) return;

    if (attachedFile) {
      if (!project) {
        window.alert('문서는 프로젝트 안에서만 업로드할 수 있어요. 먼저 프로젝트를 만들거나 선택해주세요.');
        return;
      }
      setUploading(true);
      onUploadingChange?.(true);
      try {
        await uploadDocument(attachedFile, project.id);
        await onDocumentUploaded?.();
      } catch (err) {
        setUploadError(err.message);
        setTimeout(() => setUploadError(null), 4000);
        setUploading(false);
        onUploadingChange?.(false);
        return; // 업로드 실패하면 질문 전송도 중단
      }
      setUploading(false);
      onUploadingChange?.(false);
      setAttachedFile(null);
    }

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

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    attachFile(file);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    if (!e.dataTransfer.types.includes('Files')) return;
    dragCounterRef.current += 1;
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDraggingOver(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // 이게 없으면 브라우저가 파일을 열어버리고 drop 이벤트가 안 일어남
  };

  const handleDrop = (e) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDraggingOver(false);
    attachFile(e.dataTransfer.files?.[0]);
  };

  const inputBar = (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 rounded-[2rem] border border-border/30 bg-background px-5 py-3 shadow-lg">
      {attachedFile && (
        <div className="flex items-center gap-2 rounded-xl bg-background/60 px-3 py-2 text-sm">
          <FileText size={14} className="shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate">{attachedFile.name}</span>
          {uploading && (
            <span className="shrink-0 text-xs text-muted-foreground">업로드 중...</span>
          )}
          {!uploading && (
            <button
              type="button"
              onClick={() => setAttachedFile(null)}
              className="shrink-0 rounded-md p-0.5 text-muted-foreground hover:text-destructive"
              title="첨부 취소"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

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
            title="문서 첨부"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-50 transition-colors"
          >
            <Paperclip size={16} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx"
            className="hidden"
            onChange={handleFileChange}
          />
          <ModelBadge />
          {project && (
            <span
              title={`${project.name}`}
              className="flex min-w-0 max-w-40 items-center gap-1.5 rounded-full border border-border/30 bg-muted/60 px-3 py-1 text-xs text-muted-foreground"
            >
              <Folder size={12} className="shrink-0" />
              <span className="min-w-0 flex-1 truncate">
                {project.name}
              </span>
            </span>
          )}
        </div>
        <button
          type="submit"
          disabled={isLoading || uploading || !input.trim()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-40 transition-opacity"
        >
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );

  return (
    <div
      className="relative flex h-full flex-1 flex-col bg-background"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isDraggingOver && (
        <div className="pointer-events-none absolute inset-0 z-10 m-3 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary bg-background/90">
          <FileUp size={28} className="text-primary" />
          <p className="text-sm font-medium text-primary">여기에 파일을 놓으면 첨부됩니다</p>
          <p className="text-xs text-muted-foreground">PDF, DOCX 지원 · 전송 시 업로드/인덱싱됩니다</p>
        </div>
      )}

      {/* 항상 전체 높이를 채우는 스크롤 영역. 입력창(inputBar)은 이 위에 떠 있는 불투명한
          오버레이라, 스크롤을 끝까지 내려도 마지막 메시지가 가려지지 않도록 오버레이 실측
          높이(dockHeight)만큼 하단 여백을 둔다. */}
      <div ref={scrollRef} className="no-scrollbar flex-1 overflow-y-auto px-6 pt-6">
        <div
          className="mx-auto flex max-w-5xl flex-col gap-8 transition-[padding] duration-500 ease-in-out"
          style={{ paddingBottom: hasMessages ? dockHeight + 40 : 0 }}
        >
          {session?.messages.map((message, i) => (
            <MessageBubble key={i} message={message} />
          ))}
        </div>
      </div>

      {/* 스크롤 영역 위에 떠 있는 오버레이. 메시지가 없을 땐 화면 중앙(top: 50%)에,
          메시지가 생기면 하단(top: 100%)으로 자연스럽게 이동한다. dockRef로 실제 높이를 재서
          위 스크롤 영역의 padding-bottom을 맞춘다. */}
      <div
        ref={dockRef}
        className="pointer-events-none absolute inset-x-0 flex flex-col items-center gap-6 px-6 transition-all duration-500 ease-in-out"
        style={
          hasMessages
            ? { top: '100%', transform: 'translateY(calc(-100% - 1.5rem))' }
            : { top: '50%', transform: 'translateY(-50%)' }
        }
      >
        {!hasMessages && (
          <p className="text-center text-xl text-muted-foreground transition-opacity duration-300">
            업로드한 문서에 대해 질문해보세요!
          </p>
        )}
        <form onSubmit={handleSubmit} className="pointer-events-auto w-full max-w-5xl">
          {inputBar}
        </form>
      </div>
    </div>
  );
}
