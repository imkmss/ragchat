import { useRef, useState } from 'react';
import { Upload, Loader2, FileText, Trash2 } from 'lucide-react';
import { uploadDocument, deleteDocument } from '../lib/api';

export default function RightSidebar({ documents, onRefresh }) {
  const fileInputRef = useRef(null);
  const [uploadStatus, setUploadStatus] = useState(null); // { type: 'loading'|'success'|'error', message }
  const [deletingSource, setDeletingSource] = useState(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // 같은 파일 다시 선택해도 onChange가 트리거되도록 초기화
    if (!file) return;

    setUploadStatus({ type: 'loading', message: `${file.name} 인덱싱 중...` });
    try {
      const result = await uploadDocument(file);
      setUploadStatus({
        type: 'success',
        message: `${result.filename} 인덱싱 완료 (${result.chunks} chunks)`,
      });
      await onRefresh();
    } catch (err) {
      setUploadStatus({ type: 'error', message: err.message });
    } finally {
      setTimeout(() => setUploadStatus(null), 4000);
    }
  };

  const handleDelete = async (source) => {
    if (!window.confirm(`"${source}"를 삭제할까요? (검색 인덱스에서 완전히 제거되어 더 이상 답변에 활용되지 않습니다)`)) {
      return;
    }
    setDeletingSource(source);
    try {
      await deleteDocument(source);
      await onRefresh();
    } catch (err) {
      setUploadStatus({ type: 'error', message: err.message });
      setTimeout(() => setUploadStatus(null), 4000);
    } finally {
      setDeletingSource(null);
    }
  };

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-l border-border/30 bg-sidebar text-sidebar-foreground">
      <div className="flex flex-col gap-2 p-3">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadStatus?.type === 'loading'}
          className="flex w-full items-center gap-2 rounded-lg border border-sidebar-border/50 px-3 py-2 text-sm hover:bg-sidebar-accent transition-colors disabled:opacity-50"
        >
          {uploadStatus?.type === 'loading' ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Upload size={16} />
          )}
          문서 업로드
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          onChange={handleFileChange}
        />

        {uploadStatus && uploadStatus.type !== 'loading' && (
          <p
            className={`text-xs ${
              uploadStatus.type === 'error' ? 'text-destructive' : 'text-muted-foreground'
            }`}
          >
            {uploadStatus.message}
          </p>
        )}
      </div>

      <div className="px-3 pb-1 text-xs font-medium text-muted-foreground">
        인덱싱된 문서 ({documents.length})
      </div>
      <nav className="no-scrollbar flex-1 overflow-y-auto px-2 pb-3">
        {documents.length === 0 && (
          <p className="px-2 py-4 text-sm text-muted-foreground">업로드된 문서가 없습니다.</p>
        )}
        <ul className="flex flex-col gap-1">
          {documents.map((doc) => (
            <li
              key={doc.source}
              className="group flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-sidebar-accent/60"
              title={doc.source}
            >
              <FileText size={14} className="shrink-0 opacity-60" />
              <span className="flex-1 truncate">{doc.source}</span>
              <span className="shrink-0 text-xs text-muted-foreground group-hover:hidden">
                {doc.chunks}
              </span>
              <button
                onClick={() => handleDelete(doc.source)}
                disabled={deletingSource === doc.source}
                className="hidden shrink-0 items-center justify-center rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50 group-hover:flex"
                title="삭제"
              >
                {deletingSource === doc.source ? (
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
