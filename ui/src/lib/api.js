// server.py의 POST /chat 을 호출해서 SSE(data: {...}\n\n) 스트림을 파싱한다.
// EventSource는 GET만 지원해서 못 쓰고, fetch + ReadableStream으로 직접 읽는다.

const API_BASE = '/api';

export async function streamChat(question, history, projectId, { onSources, onToken, onDone, onError }) {
  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, history, project_id: projectId }),
  });

  if (!response.ok || !response.body) {
    onError?.(`서버 오류 (${response.status})`);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';

    for (const raw of events) {
      const line = raw.trim();
      if (!line.startsWith('data:')) continue;
      const payload = line.slice('data:'.length).trim();
      if (!payload) continue;

      let event;
      try {
        event = JSON.parse(payload);
      } catch {
        continue;
      }

      if (event.type === 'sources') onSources?.(event.data);
      else if (event.type === 'token') onToken?.(event.data);
      else if (event.type === 'error') onError?.(event.data);
      else if (event.type === 'done') onDone?.(event.data);
    }
  }
}

export async function generateTitle(question) {
  const response = await fetch(`${API_BASE}/title`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });
  if (!response.ok) throw new Error(`제목 생성 실패 (${response.status})`);
  const data = await response.json();
  return data.title;
}

export async function indexDirectory(path) {
  const response = await fetch(`${API_BASE}/index`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  });
  return response.json();
}

export async function uploadDocument(file, projectId) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('project_id', projectId);

  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || `업로드 실패 (${response.status})`);
  }
  return data;
}

export async function listDocuments(projectId) {
  if (!projectId) return [];
  const response = await fetch(`${API_BASE}/documents?project_id=${encodeURIComponent(projectId)}`);
  if (!response.ok) return [];
  return response.json();
}

export async function getModels() {
  const response = await fetch(`${API_BASE}/models`);
  if (!response.ok) return null;
  return response.json();
}

export async function deleteDocument(docId) {
  const response = await fetch(`${API_BASE}/documents/${encodeURIComponent(docId)}`, {
    method: 'DELETE',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || `삭제 실패 (${response.status})`);
  }
  return data;
}
