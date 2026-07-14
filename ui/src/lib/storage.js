// 채팅 세션을 브라우저 localStorage에 저장/관리 (서버는 대화 기록을 저장하지 않음).

const STORAGE_KEY = 'ragchat-sessions';
const PROJECTS_STORAGE_KEY = 'ragchat-projects';

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

// projectId가 없으면(null) 어느 프로젝트에도 속하지 않은 일반 채팅이 된다.
export function createSession(projectId = null) {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    projectId,
    title: '새 채팅',
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function loadProjects() {
  try {
    const raw = localStorage.getItem(PROJECTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveProjects(projects) {
  localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
}

export function createProject(name) {
  return {
    id: crypto.randomUUID(),
    name,
    createdAt: Date.now(),
  };
}

export function deriveTitle(question) {
  const trimmed = question.trim();
  return trimmed.length > 30 ? `${trimmed.slice(0, 30)}...` : trimmed;
}
