// 채팅 세션을 브라우저 localStorage에 저장/관리 (서버는 대화 기록을 저장하지 않음).

const STORAGE_KEY = 'ragchat-sessions';
const PROJECTS_STORAGE_KEY = 'ragchat-projects';

// crypto.randomUUID()는 보안 컨텍스트(HTTPS 또는 localhost)에서만 동작해서,
// 사내망 IP로 그냥 http:// 접속하면 죽는다. crypto.getRandomValues()는 보안 컨텍스트
// 제약이 없어서 이걸로 직접 UUID v4를 만든다.
function generateId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

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
    id: generateId(),
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
    id: generateId(),
    name,
    createdAt: Date.now(),
  };
}

export function deriveTitle(question) {
  const trimmed = question.trim();
  return trimmed.length > 30 ? `${trimmed.slice(0, 30)}...` : trimmed;
}
