// 채팅 세션을 브라우저 localStorage에 저장/관리 (서버는 대화 기록을 저장하지 않음).

const STORAGE_KEY = 'ragchat-sessions';

export function loadSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSessions(sessions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function createSession() {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: '새 채팅',
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function deriveTitle(question) {
  const trimmed = question.trim();
  return trimmed.length > 30 ? `${trimmed.slice(0, 30)}...` : trimmed;
}
