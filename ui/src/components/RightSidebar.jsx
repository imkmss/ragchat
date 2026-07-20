import { useEffect, useState } from 'react';
import { FileText, Trash2, Loader2, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { deleteDocument } from '../lib/api';

// 문서 업로드는 좌측 사이드바의 프로젝트 행에서 한다 (문서는 프로젝트별로 격리되므로
// 업로드도 어느 프로젝트인지가 항상 명확한 그 위치에서 트리거하는 게 맞다).
// 여기서는 현재 보고 있는 채팅이 속한 프로젝트의 문서를 읽기 전용으로 보여준다.
export default function RightSidebar({ documents, project, onRefresh }) {
  const [collapsed, setCollapsed] = useState(!project);
  const [deletingDocId, setDeletingDocId] = useState(null);
  const [error, setError] = useState(null);

  // 프로젝트가 바뀔 때마다(다른 프로젝트로 전환, 미분류 채팅/메인 화면으로 이동 등)
  // 기본 상태로 되돌린다: 프로젝트가 있으면 펼침, 없으면 접힘. 같은 프로젝트를 보는 동안
  // 사용자가 수동으로 접었다 펼쳤다 한 상태는 유지된다.
  useEffect(() => {
    setCollapsed(!project);
  }, [project?.id]);

  const handleDelete = async (doc) => {
    if (!window.confirm(`"${doc.source}"를 삭제할까요? (검색 인덱스에서 완전히 제거되어 더 이상 답변에 활용되지 않습니다)`)) {
      return;
    }
    setDeletingDocId(doc.doc_id);
    try {
      await deleteDocument(doc.doc_id);
      await onRefresh();
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(null), 4000);
    } finally {
      setDeletingDocId(null);
    }
  };

  if (collapsed) {
    return (
      <div className="flex h-full w-12 shrink-0 flex-col items-center border-l border-border/30 bg-sidebar py-3">
        <button
          onClick={() => setCollapsed(false)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          title="문서 패널 펼치기"
        >
          <PanelRightOpen size={16} />
        </button>
      </div>
    );
  }

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-l border-border/30 bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 px-3 pt-3 pb-1">
        <div className="flex-1 min-w-0 truncate text-xs font-medium text-muted-foreground">
          {project ? `${project.name} 프로젝트의 문서 (${documents.length})` : '문서'}
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          title="문서 패널 접기"
        >
          <PanelRightClose size={14} />
        </button>
      </div>

      {error && <p className="px-3 pb-1 text-xs text-destructive">{error}</p>}

      <nav className="no-scrollbar flex-1 overflow-y-auto px-2 pb-3">
        {!project && (
          <p className="px-2 py-4 text-sm text-muted-foreground">
            프로젝트에 속한 채팅에서만 문서를 볼 수 있어요. 좌측에서 프로젝트를 만들거나
            선택해주세요.
          </p>
        )}
        {project && documents.length === 0 && (
          <p className="px-2 py-4 text-sm text-muted-foreground">
            아직 업로드된 문서가 없습니다. 좌측 프로젝트 목록의 업로드 버튼으로 추가해보세요.
          </p>
        )}
        <ul className="flex flex-col gap-1">
          {documents.map((doc) => (
            <li
              key={doc.doc_id}
              className="group flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-sidebar-accent/60"
              title={doc.source}
            >
              <FileText size={14} className="shrink-0 opacity-60" />
              <span className="flex-1 truncate">{doc.source}</span>
              <span className="shrink-0 text-xs text-muted-foreground group-hover:hidden">
                {doc.chunks}
              </span>
              <button
                onClick={() => handleDelete(doc)}
                disabled={deletingDocId === doc.doc_id}
                className="hidden shrink-0 items-center justify-center rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50 group-hover:flex"
                title="삭제"
              >
                {deletingDocId === doc.doc_id ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Trash2 size={13} />
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
