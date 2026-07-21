import { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import RightSidebar from './components/RightSidebar';
import { streamChat, listDocuments, generateTitle, uploadDocument } from './lib/api';
import {
  loadSessions,
  saveSessions,
  createSession,
  deriveTitle,
  loadProjects,
  saveProjects,
  createProject,
} from './lib/storage';

const MAX_HISTORY_MESSAGES = 8; // config.py의 MAX_HISTORY_MESSAGES와 맞춰둔다

function App() {
  const [sessions, setSessions] = useState(() => loadSessions());
  // 페이지를 새로 열 때마다 마지막으로 보던 채팅을 이어서 띄우지 않고,
  // 항상 "새 채팅" 빈 화면부터 시작한다. 기존 대화 기록은 사이드바에 그대로 남아있다.
  const [activeId, setActiveId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [documents, setDocuments] = useState([]);
  // 지금 보고 있는 프로젝트로 업로드가 진행 중인지 — 우측 사이드바 로딩 표시용.
  // (좌측 사이드바 프로젝트 행의 업로드 버튼은 어느 프로젝트로 올리든 자체 스피너가 있어
  // 별개로 동작하고, 여긴 "지금 보고 있는 프로젝트"로 올라갈 때만 켠다.)
  const [isUploading, setIsUploading] = useState(false);
  const [projects, setProjects] = useState(() => loadProjects());
  // "새 채팅"을 눌러도 세션은 아직 안 만들고(목록에 안 남게), 실제로 첫 메시지를
  // 보낼 때 만든다. 그 전까지 이 프로젝트 소속으로 만들 예정인지만 기억해둔다.
  const [draftProjectId, setDraftProjectId] = useState(null);

  useEffect(() => {
    saveSessions(sessions);
  }, [sessions]);

  useEffect(() => {
    saveProjects(projects);
  }, [projects]);

  const activeSession = sessions.find((s) => s.id === activeId) ?? null;
  // 아직 세션이 안 만들어진 "새 채팅 대기" 상태에서도(draftProjectId), 그리고 이미
  // 프로젝트에 속한 채팅을 보고 있을 때도 우측 문서 목록/업로드가 같은 프로젝트를 보게 한다.
  const currentProjectId = activeSession?.projectId ?? draftProjectId;

  const refreshDocuments = async (projectId) => {
    setDocuments(await listDocuments(projectId));
  };

  // currentProjectId만 보면 같은 프로젝트의 다른 채팅방으로 전환할 때는 값이 안 바뀌어서
  // effect가 재실행이 안 된다 — 그 사이 다른 채팅방(또는 다른 탭)에서 업로드된 문서를
  // 놓치게 되므로, 어느 채팅방을 보고 있는지(activeId) 바뀔 때도 항상 다시 가져온다.
  useEffect(() => {
    refreshDocuments(currentProjectId);
  }, [currentProjectId, activeId]);

  const updateSession = (id, updater) => {
    setSessions((prev) => {
      const updated = prev.map((s) => (s.id === id ? { ...updater(s), updatedAt: Date.now() } : s));
      // 방금 수정된(=updatedAt이 가장 최근인) 채팅이 목록 맨 위로 오도록 정렬한다.
      return updated.sort((a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt));
    });
  };

  const handleNew = (projectId = null) => {
    setActiveId(null);
    setDraftProjectId(projectId);
  };

  const handleSelect = (id) => {
    setActiveId(id);
    setDraftProjectId(null); // 기존 채팅을 골랐으니 "새 채팅 대기" 상태는 해제
  };

  const handleDeleteSession = (id) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (id === activeId) {
      setActiveId(null);
      setDraftProjectId(null);
    }
  };

  const handleNewProject = () => {
    const name = window.prompt('프로젝트 이름을 입력하세요')?.trim();
    if (!name) return;
    setProjects((prev) => [createProject(name), ...prev]);
  };

  const handleRenameProject = (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, name: trimmed } : p)));
  };

  const handleDeleteProject = (id) => {
    const project = projects.find((p) => p.id === id);
    if (!project) return;
    if (!window.confirm(`"${project.name}" 프로젝트를 삭제할까요? (채팅 자체는 지워지지 않고 일반 채팅으로 남습니다)`)) {
      return;
    }
    setProjects((prev) => prev.filter((p) => p.id !== id));
    // 프로젝트만 없애고, 그 안의 채팅은 일반(미분류) 채팅으로 남긴다.
    setSessions((prev) => prev.map((s) => (s.projectId === id ? { ...s, projectId: null } : s)));
  };

  const handleMoveToProject = (sessionId, projectId) => {
    setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, projectId } : s)));
  };

  const handleUploadToProject = async (projectId, file) => {
    const isCurrent = projectId === currentProjectId;
    if (isCurrent) setIsUploading(true);
    try {
      const result = await uploadDocument(file, projectId);
      if (isCurrent) {
        await refreshDocuments(projectId);
      }
      return result;
    } catch (err) {
      window.alert(err.message);
      return null;
    } finally {
      if (isCurrent) setIsUploading(false);
    }
  };

  const handleSend = async (question) => {
    let session = activeSession;
    if (!session) {
      session = createSession(draftProjectId);
      setSessions((prev) => [session, ...prev]);
      setActiveId(session.id);
      setDraftProjectId(null);
    }

    const sessionId = session.id;
    const isFirstMessage = session.messages.length === 0;
    // 새 질문을 추가하기 전 시점의 대화 기록에서 최근 것만 잘라 히스토리로 보낸다.
    // session.messages 자체(화면 표시/localStorage 저장)는 그대로 두고, 이번 요청에만 쓸
    // 임시 사본을 만드는 것 — sources/stats 같은 UI 전용 필드는 제외하고 role/content만 남긴다.
    const history = session.messages
      .slice(-MAX_HISTORY_MESSAGES)
      .map(({ role, content }) => ({ role, content }));

    updateSession(sessionId, (s) => ({
      ...s,
      title: isFirstMessage ? deriveTitle(question) : s.title,
      messages: [
        ...s.messages,
        { role: 'user', content: question },
        { role: 'assistant', content: '', sources: [] },
      ],
    }));

    if (isFirstMessage) {
      // 임시로 질문 앞부분을 제목으로 써두고, 주제 요약이 오면 그걸로 교체한다.
      // 실패해도(네트워크 등) 기존 제목을 그대로 두면 되므로 조용히 무시한다.
      generateTitle(question)
        .then((title) => updateSession(sessionId, (s) => ({ ...s, title })))
        .catch(() => {});
    }

    setIsLoading(true);
    try {
      await streamChat(question, history, session.projectId, {
        onSources: (sources) => {
          updateSession(sessionId, (s) => {
            const messages = [...s.messages];
            messages[messages.length - 1] = {
              ...messages[messages.length - 1],
              sources,
            };
            return { ...s, messages };
          });
        },
        onToken: (token) => {
          updateSession(sessionId, (s) => {
            const messages = [...s.messages];
            const last = messages[messages.length - 1];
            messages[messages.length - 1] = { ...last, content: last.content + token };
            return { ...s, messages };
          });
        },
        onError: (message) => {
          updateSession(sessionId, (s) => {
            const messages = [...s.messages];
            const last = messages[messages.length - 1];
            messages[messages.length - 1] = {
              ...last,
              content: last.content || `오류: ${message}`,
            };
            return { ...s, messages };
          });
        },
        onDone: (stats) => {
          updateSession(sessionId, (s) => {
            const messages = [...s.messages];
            const last = messages[messages.length - 1];
            messages[messages.length - 1] = { ...last, stats };
            return { ...s, messages };
          });
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar
        sessions={sessions}
        activeId={activeId}
        onSelect={handleSelect}
        onNew={handleNew}
        onDelete={handleDeleteSession}
        projects={projects}
        onNewProject={handleNewProject}
        onRenameProject={handleRenameProject}
        onDeleteProject={handleDeleteProject}
        onMoveToProject={handleMoveToProject}
        onUploadToProject={handleUploadToProject}
      />
      <ChatWindow
        session={activeSession}
        projects={projects}
        currentProjectId={currentProjectId}
        isLoading={isLoading}
        onSend={handleSend}
        onDocumentUploaded={() => refreshDocuments(currentProjectId)}
        onUploadingChange={setIsUploading}
      />
      <RightSidebar
        documents={documents}
        project={projects.find((p) => p.id === currentProjectId) ?? null}
        onRefresh={() => refreshDocuments(currentProjectId)}
        isUploading={isUploading}
      />
    </div>
  );
}

export default App;
