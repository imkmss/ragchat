import { useEffect, useRef, useState } from 'react';
import {
  Plus,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Trash2,
  Folder,
  FolderPlus,
  ChevronDown,
  ChevronRight,
  Upload,
  Loader2,
} from 'lucide-react';

const ACCEPTED_EXTENSIONS = ['.pdf', '.docx'];

const MIN_WIDTH = 180;
const MAX_WIDTH = 420;
const DEFAULT_WIDTH = 256;
const STORAGE_KEY = 'ragchat-sidebar-width';

export default function Sidebar({
  sessions,
  activeId,
  onSelect,
  onNew,
  onDelete,
  projects,
  onNewProject,
  onDeleteProject,
  onMoveToProject,
  onUploadToProject,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [collapsedProjects, setCollapsedProjects] = useState(() => new Set());
  const [dragOverTarget, setDragOverTarget] = useState(null); // project id, 'ungrouped', 또는 null
  const uploadFileInputRef = useRef(null);
  const uploadTargetProjectIdRef = useRef(null); // 업로드 버튼을 누른 프로젝트를 기억해뒀다가 파일 선택 후 씀
  const [uploadingProjectId, setUploadingProjectId] = useState(null);
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

  const startUploadToProject = (projectId) => {
    uploadTargetProjectIdRef.current = projectId;
    uploadFileInputRef.current?.click();
  };

  const handleUploadFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // 같은 파일 다시 선택해도 onChange가 트리거되도록 초기화
    const projectId = uploadTargetProjectIdRef.current;
    if (!file || !projectId) return;

    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      window.alert(`지원하지 않는 파일 형식: ${ext}`);
      return;
    }

    setUploadingProjectId(projectId);
    try {
      await onUploadToProject(projectId, file);
    } finally {
      setUploadingProjectId(null);
    }
  };

  const toggleProjectCollapsed = (id) => {
    setCollapsedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 프로젝트별 채팅 개수가 이전 렌더보다 늘었으면(새로 생겼든, 다른 곳에서 옮겨왔든
  // 상관없이) 그 프로젝트를 자동으로 펼친다.
  const countSessionsByProject = (list) => {
    const counts = new Map();
    list.forEach((s) => {
      if (!s.projectId) return;
      counts.set(s.projectId, (counts.get(s.projectId) ?? 0) + 1);
    });
    return counts;
  };

  const prevProjectCountsRef = useRef(countSessionsByProject(sessions));

  useEffect(() => {
    const prevCounts = prevProjectCountsRef.current;
    const currentCounts = countSessionsByProject(sessions);
    const projectsToExpand = [...currentCounts.entries()]
      .filter(([id, count]) => count > (prevCounts.get(id) ?? 0))
      .map(([id]) => id);

    if (projectsToExpand.length > 0) {
      setCollapsedProjects((prev) => {
        const next = new Set(prev);
        projectsToExpand.forEach((id) => next.delete(id));
        return next;
      });
    }

    prevProjectCountsRef.current = currentCounts;
  }, [sessions]);

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

  const ungrouped = sessions.filter((s) => !s.projectId);

  const renderSession = (session) => (
    <li
      key={session.id}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', session.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragEnd={() => setDragOverTarget(null)}
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
      <select
        value={session.projectId ?? ''}
        onChange={(e) => onMoveToProject(session.id, e.target.value || null)}
        onClick={(e) => e.stopPropagation()}
        title="프로젝트로 이동"
        className="hidden w-16 shrink-0 rounded-md border-none bg-transparent text-[11px] text-muted-foreground group-hover:block"
      >
        <option value="">일반</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <button
        onClick={(e) => handleDelete(e, session)}
        className="hidden shrink-0 items-center justify-center rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive group-hover:flex"
        title="삭제"
      >
        <Trash2 size={13} />
      </button>
    </li>
  );

  return (
    <aside
      style={{ width }}
      className="relative flex h-full shrink-0 flex-col border-r border-border/30 bg-sidebar text-sidebar-foreground"
    >
      <div className="flex items-center gap-2 p-3 pb-0">
        <button
          onClick={() => onNew()}
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

      <div className="p-3 pb-2">
        <button
          onClick={onNewProject}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent transition-colors"
        >
          <FolderPlus size={16} />
          프로젝트
        </button>
        {/* 프로젝트 행마다 있는 업로드 버튼이 공유하는 숨겨진 input. 어느 프로젝트용인지는
            uploadTargetProjectIdRef로 기억해뒀다가 파일 선택 시점에 꺼내 쓴다. */}
        <input
          ref={uploadFileInputRef}
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          onChange={handleUploadFileChange}
        />
      </div>

      <nav className="no-scrollbar flex-1 overflow-y-auto px-2 pb-3">
        {sessions.length === 0 && (
          <p className="px-2 py-4 text-sm text-muted-foreground">채팅 기록이 없습니다.</p>
        )}

        {projects.map((project) => {
          const projectSessions = sessions.filter((s) => s.projectId === project.id);
          const isCollapsed = collapsedProjects.has(project.id);
          return (
            <div
              key={project.id}
              className="mb-1"
              onDragOver={(e) => {
                e.preventDefault(); // 이게 없으면 drop 이벤트가 안 일어남
                setDragOverTarget(project.id);
              }}
              onDragLeave={() => setDragOverTarget((prev) => (prev === project.id ? null : prev))}
              onDrop={(e) => {
                e.preventDefault();
                const sessionId = e.dataTransfer.getData('text/plain');
                if (sessionId) onMoveToProject(sessionId, project.id);
                setDragOverTarget(null);
              }}
            >
              <div
                className={`group/project flex items-center gap-1 rounded-lg pr-1 transition-colors ${
                  dragOverTarget === project.id ? 'bg-primary/10 ring-1 ring-primary/40' : ''
                }`}
              >
                <button
                  onClick={() => toggleProjectCollapsed(project.id)}
                  className="flex flex-1 min-w-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs font-medium text-muted-foreground hover:bg-sidebar-accent/60"
                >
                  {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                  <Folder size={13} className="shrink-0" />
                  <span className="flex-1 truncate">{project.name}</span>
                  <span className="shrink-0 opacity-60">{projectSessions.length}</span>
                </button>
                <button
                  onClick={() => onNew(project.id)}
                  title="이 프로젝트에 새 채팅"
                  className="hidden shrink-0 items-center justify-center rounded-md p-1 text-muted-foreground hover:bg-sidebar-accent group-hover/project:flex"
                >
                  <Plus size={12} />
                </button>
                <button
                  onClick={() => startUploadToProject(project.id)}
                  disabled={uploadingProjectId === project.id}
                  title="이 프로젝트에 문서 업로드"
                  className="hidden shrink-0 items-center justify-center rounded-md p-1 text-muted-foreground hover:bg-sidebar-accent disabled:opacity-50 group-hover/project:flex"
                >
                  {uploadingProjectId === project.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Upload size={12} />
                  )}
                </button>
                <button
                  onClick={() => onDeleteProject(project.id)}
                  title="프로젝트 삭제"
                  className="hidden shrink-0 items-center justify-center rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive group-hover/project:flex"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              {!isCollapsed && (
                <ul className="flex flex-col gap-1 pl-3">{projectSessions.map(renderSession)}</ul>
              )}
            </div>
          );
        })}

        <ul
          className={`flex flex-col gap-1 rounded-lg transition-colors ${
            dragOverTarget === 'ungrouped' ? 'bg-primary/10 ring-1 ring-primary/40' : ''
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverTarget('ungrouped');
          }}
          onDragLeave={() => setDragOverTarget((prev) => (prev === 'ungrouped' ? null : prev))}
          onDrop={(e) => {
            e.preventDefault();
            const sessionId = e.dataTransfer.getData('text/plain');
            if (sessionId) onMoveToProject(sessionId, null);
            setDragOverTarget(null);
          }}
        >
          {ungrouped.map(renderSession)}
        </ul>
      </nav>

      <div
        onMouseDown={startResizing}
        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-primary/40 active:bg-primary/60"
      />
    </aside>
  );
}
