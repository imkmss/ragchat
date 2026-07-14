import { useEffect, useRef, useState } from 'react';
import { Plus, MessageSquare, PanelLeftClose, PanelLeftOpen, Trash2 } from 'lucide-react';

const MIN_WIDTH = 180;
const MAX_WIDTH = 420;
const DEFAULT_WIDTH = 256;
const STORAGE_KEY = 'ragchat-sidebar-width';

export default function Sidebar({ sessions, activeId, onSelect, onNew, onDelete }) {
  const [collapsed, setCollapsed] = useState(false);
  const [width, setWidth] = useState(() => {
    const saved = Number(localStorage.getItem(STORAGE_KEY));
    return saved >= MIN_WIDTH && saved <= MAX_WIDTH ? saved : DEFAULT_WIDTH;
  });
  const isResizingRef = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizingRef.current) return;
      setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX)));
    };
    const handleMouseUp = () => {
      if (!isResizingRef.current) return;
      isResizingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setWidth((w) => {
        localStorage.setItem(STORAGE_KEY, String(w));
        return w;
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const startResizing = () => {
    isResizingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleDelete = (e, session) => {
    e.stopPropagation();
    if (window.confirm(`"${session.title}" 채팅을 삭제할까요?`)) {
      onDelete(session.id);
    }
  };

  if (collapsed) {
    return (
      <div className="flex h-full w-12 shrink-0 flex-col items-center border-r border-border/30 bg-sidebar py-3">
        <button
          onClick={() => setCollapsed(false)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          title="사이드바 펼치기"
        >
          <PanelLeftOpen size={16} />
        </button>
      </div>
    );
  }

  return (
    <aside
      style={{ width }}
      className="relative flex h-full shrink-0 flex-col border-r border-border/30 bg-sidebar text-sidebar-foreground"
    >
      <div className="flex items-center gap-2 p-3">
        <button
          onClick={onNew}
          className="flex flex-1 items-center gap-2 rounded-lg border border-sidebar-border/50 px-3 py-2 text-sm hover:bg-sidebar-accent transition-colors"
        >
          <Plus size={16} />
          새 채팅
        </button>
        <button
          onClick={() => setCollapsed(true)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          title="사이드바 접기"
        >
          <PanelLeftClose size={16} />
        </button>
      </div>

      <nav className="no-scrollbar flex-1 overflow-y-auto px-2 pb-3">
        {sessions.length === 0 && (
          <p className="px-2 py-4 text-sm text-muted-foreground">채팅 기록이 없습니다.</p>
        )}
        <ul className="flex flex-col gap-1">
          {sessions.map((session) => (
            <li
              key={session.id}
              className={`group flex items-center gap-1 rounded-lg pr-1 transition-colors ${
                session.id === activeId
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'hover:bg-sidebar-accent/60 text-sidebar-foreground'
              }`}
            >
              <button
                onClick={() => onSelect(session.id)}
                className="flex flex-1 min-w-0 items-center gap-2 px-3 py-2 text-left text-sm truncate"
              >
                <MessageSquare size={14} className="shrink-0 opacity-60" />
                <span className="truncate">{session.title}</span>
              </button>
              <button
                onClick={(e) => handleDelete(e, session)}
                className="hidden shrink-0 items-center justify-center rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive group-hover:flex"
                title="삭제"
              >
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div
        onMouseDown={startResizing}
        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-primary/40 active:bg-primary/60"
      />
    </aside>
  );
}
