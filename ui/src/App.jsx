import { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import RightSidebar from './components/RightSidebar';
import { streamChat, listDocuments } from './lib/api';
import { loadSessions, saveSessions, createSession, deriveTitle } from './lib/storage';

function App() {
  const [sessions, setSessions] = useState(() => loadSessions());
  const [activeId, setActiveId] = useState(() => sessions[0]?.id ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    saveSessions(sessions);
  }, [sessions]);

  const refreshDocuments = async () => {
    setDocuments(await listDocuments());
  };

  useEffect(() => {
    refreshDocuments();
  }, []);

  const activeSession = sessions.find((s) => s.id === activeId) ?? null;

  const updateSession = (id, updater) => {
    setSessions((prev) => prev.map((s) => (s.id === id ? updater(s) : s)));
  };

  const handleNew = () => {
    const session = createSession();
    setSessions((prev) => [session, ...prev]);
    setActiveId(session.id);
  };

  const handleDeleteSession = (id) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (id === activeId) setActiveId(null);
  };

  const handleSend = async (question) => {
    let session = activeSession;
    if (!session) {
      session = createSession();
      setSessions((prev) => [session, ...prev]);
      setActiveId(session.id);
    }

    const sessionId = session.id;
    const isFirstMessage = session.messages.length === 0;

    updateSession(sessionId, (s) => ({
      ...s,
      title: isFirstMessage ? deriveTitle(question) : s.title,
      messages: [
        ...s.messages,
        { role: 'user', content: question },
        { role: 'assistant', content: '', sources: [] },
      ],
    }));

    setIsLoading(true);
    try {
      await streamChat(question, {
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
        onSelect={setActiveId}
        onNew={handleNew}
        onDelete={handleDeleteSession}
      />
      <ChatWindow
        session={activeSession}
        isLoading={isLoading}
        onSend={handleSend}
        onDocumentUploaded={refreshDocuments}
      />
      <RightSidebar documents={documents} onRefresh={refreshDocuments} />
    </div>
  );
}

export default App;
