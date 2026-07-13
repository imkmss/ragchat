# RAG 챗봇 구현 정리

## 전체 파이프라인

```
문서 입력(PDF/DOCX)
  → 파싱 (PyMuPDF / python-docx)
  → 청킹 (토큰 길이 기준)
  → 임베딩 (Qwen3-Embedding-0.6B, Ollama 로컬 API)
  → 벡터 저장 (ChromaDB)
  → [질의 시점]
  → 질문 임베딩 → 리트리버 top-5 검색
  → 프롬프트 구성 → LLM(Qwen3-8B, Ollama 로컬 API) → 답변 생성(+출처, 스트리밍)
```

검색(retrieval)과 생성(generation) 둘 다 구현되어 있고, 임베딩·생성 모두 이 맥북에
설치된 Ollama 하나로 서빙된다 — 별도 서버나 클라우드 API가 필요 없다.

## 기술 스택 결정 사항

| 단계 | 선택 | 비고 |
|---|---|---|
| PDF 파싱 | PyMuPDF (`fitz`) | 페이지 단위 텍스트 + 페이지 번호 메타데이터 추출 |
| DOCX 파싱 | python-docx | 문단 단위 텍스트 결합 |
| 청킹 | langchain-text-splitters (`RecursiveCharacterTextSplitter`) | length_function을 Qwen3-Embedding 토크나이저 기준으로 맞춤 |
| 임베딩 | Qwen3-Embedding-0.6B (Ollama 로컬 API) | `ollama pull qwen3-embedding:0.6b` 후 `http://127.0.0.1:11434/api/embed` 호출 |
| 벡터DB | ChromaDB (파일 기반, PersistentClient) | 별도 서버 없이 로컬 구동 |
| 생성 LLM | Qwen3-8B, Q4 양자화 (Ollama 로컬 API) | 미리 받아둔 gguf를 `Modelfile`로 Ollama에 import, `/api/chat` 스트리밍 호출 |
| API 서버 | FastAPI + uvicorn (`server.py`) | UI에서 호출할 `/chat`(SSE 스트리밍), `/index`, `/health` 제공 |
| top-k | 5 | 사용자 요구사항 |

### 임베딩 방식 변경 이력

세션 중 임베딩 서빙 방식을 세 번 바꿨다 (모두 `embedding/embedder.py` 한 파일만
교체하면 되는 구조 — 검색/벡터DB 등 나머지 코드는 무관):

1. **로컬 sentence-transformers** (최초) — `Qwen/Qwen3-Embedding-0.6B`를 파이썬 프로세스 안에서 직접 로드/추론 (MPS 사용)
2. **사내망 BGE-M3 API** (중간 실험) — `http://192.168.123.60:18003`의 BGE-M3 모델 호출. 네트워크가 끊기면 못 쓰는 문제로 보류
3. **Ollama 로컬 API** (현재) — 이 맥북에 Ollama를 네이티브 설치하고 `qwen3-embedding:0.6b`를 pull, `http://127.0.0.1:11434/api/embed`로 호출. 로컬 완결 + 원래 계획했던 Qwen3-Embedding 모델 유지라는 두 조건을 다 만족해서 채택

### 생성(LLM) 방식 결정 이력

한때 리트리버 단계까지만 남기고 생성을 통째로 제거했다가, 아래 이유로 Ollama 기반으로
다시 구현했다.

- **llama.cpp(`llama-server`) 대신 Ollama 선택**: 임베딩이 이미 Ollama로 서빙되고 있어서,
  생성도 같은 Ollama 하나로 합치면 관리할 로컬 서비스가 하나로 줄어듦 (매번 `llama-server &`로
  수동 실행할 필요가 없고, Ollama 앱이 상시 백그라운드로 떠 있음)
- **기존에 받아둔 gguf 재사용**: `models/Qwen3-8B-Q4_K_M.gguf`(~5GB, llama.cpp 실험 때 받아둔 것)를
  Ollama 레지스트리에서 다시 받지 않고, `Modelfile`(`FROM ./models/Qwen3-8B-Q4_K_M.gguf`)로
  `ollama create qwen3-8b-local -f Modelfile` 해서 그대로 import
- **스트리밍 응답 UTF-8 처리 주의**: `requests`의 `iter_lines(decode_unicode=True)`는 네트워크
  청크 경계에서 멀티바이트(한글) 문자가 잘리면 깨지는 문제가 있어서, bytes로 받은 뒤 완성된
  줄 단위로만 `utf-8` 디코딩하도록 `generation/llm.py`에 구현 (임베딩 스트리밍 때도 동일 이슈를 겪었음)

## 왜 이렇게 결정했는가

- **임베딩 0.6B**: 임베딩은 텍스트를 벡터로 바꾸는 상대적으로 단순한 작업이라 작은 모델로도 검색 성능이 잘 나옴
- **생성 8B**: 검색된 컨텍스트를 읽고 자연스러운 답변을 합성하는 건 복잡한 작업이라 모델 크기가 작으면 품질이 떨어짐. 16GB 메모리 예산상 8B도 여유 있어 굳이 낮출 필요 없음
- **Ollama로 임베딩/생성 통합 서빙**: 하나의 로컬 API(`http://127.0.0.1:11434`)로 임베딩과 생성을 모두 처리하면, `embedding/embedder.py`와 `generation/llm.py`가 같은 패턴(HTTP POST + 스트리밍 파싱)을 공유해서 구조가 일관됨
- **쿼리/문서 임베딩 분리**: Qwen3-Embedding은 검색 시 쿼리에 instruction prefix(`"Instruct: ...\nQuery: ..."`)를 붙여야 성능이 제대로 나오고, 문서(청크)는 prefix 없이 인코딩해야 함 → `embedder.py`에서 `embed_query()` / `embed_documents()`로 함수 분리
- **동일 임베딩 모델 고정**: 인덱싱과 질의에서 다른 임베딩 모델을 쓰면 벡터 공간이 어긋나 검색이 깨지므로, 임베딩 모델을 바꿀 때마다 `chroma_db`를 반드시 초기화하고 재인덱싱해야 함
- **UI와 백엔드 분리**: `server.py`(FastAPI)가 검색+생성 로직을 SSE로 노출해서, UI(React 등 별도 프론트엔드)는 이 API 하나만 알면 됨 — 내부적으로 Ollama를 쓰는지 다른 백엔드를 쓰는지는 UI 쪽 코드에 전혀 영향 없음

## 프로젝트 구조

```
ragchat/
├── requirements.txt
├── config.py                    # Ollama 주소/모델명, chunk size, top_k 등 중앙 설정
├── Modelfile                    # 로컬 gguf를 Ollama 모델로 등록하기 위한 정의
├── ingestion/
│   ├── loaders.py                # PDF/DOCX → 텍스트 + 메타데이터(source, page)
│   └── chunker.py                # Qwen3-Embedding 토크나이저 기준 토큰 청킹
├── embedding/
│   └── embedder.py               # Ollama qwen3-embedding:0.6b 호출, embed_documents()/embed_query() 분리
├── vectorstore/
│   └── store.py                  # ChromaDB upsert/search
├── retrieval/
│   └── retriever.py              # 질문 → 임베딩 → top-5 검색
├── generation/
│   ├── prompt.py                  # 시스템 프롬프트 + 컨텍스트 + 질문 조립
│   └── llm.py                     # Ollama qwen3-8b-local 호출 (스트리밍)
├── pipeline/
│   ├── index_pipeline.py          # 문서 → 파싱 → 청킹 → 임베딩 → 저장
│   └── query_pipeline.py          # 질문 → 검색 → 프롬프트 → LLM → 답변+출처 (스트리밍)
├── server.py                      # FastAPI: /chat(SSE), /index, /health — UI가 호출할 API
├── models/
│   └── Qwen3-8B-Q4_K_M.gguf      # Modelfile로 Ollama에 import한 원본 gguf
└── main.py                        # CLI: index / search / chat
```

## 환경 세팅 이력

- 시스템 기본 Python은 3.9.6 → 최신 라이브러리 호환 위해 Homebrew로 Python 3.11 설치
- 가상환경은 `venv` → **`uv`로 전환** (`uv venv --python 3.11`로 `.venv/` 생성, `uv pip install -r requirements.txt`로 설치 — pip/venv보다 빠름)
- VSCode 인터프리터를 `.venv/bin/python`으로 지정
- Ollama는 Homebrew가 아니라 `/Applications/Ollama.app` 네이티브 앱으로 설치, 기본적으로 `127.0.0.1:11434`에서 백그라운드 서비스로 상시 구동
- 로컬 임베딩 추론이 없어지면서 `requirements.txt`에서 `sentence-transformers`/`torch` 제거 (청킹용 토크나이저 때문에 `transformers`는 유지), 대신 `requests`, `fastapi`, `uvicorn` 추가

## 실행 방법

```bash
# Ollama 앱이 실행 중이어야 함 (메뉴바에 아이콘 확인, 없으면 /Applications/Ollama.app 실행)
ollama pull qwen3-embedding:0.6b            # 임베딩 모델 최초 1회 다운로드 (~639MB)
ollama create qwen3-8b-local -f Modelfile   # 생성 모델을 로컬 gguf에서 import (최초 1회)

uv venv --python 3.11
source .venv/bin/activate
uv pip install -r requirements.txt

python main.py index ./data     # data 폴더의 pdf/docx 인덱싱
python main.py search <질문>     # top-5 검색 결과만 확인
python main.py chat             # 대화형 질의응답 (검색 + 생성, 스트리밍)

# UI에서 붙일 API 서버
uvicorn server:app --reload --port 8000
```

## 남은 작업 / 향후 고려사항

- [ ] 웹 UI 구현 (React + Vite + Tailwind 예정, `llamacpp-ui-style` 스킬 참고 가능)
- [ ] 실제 문서로 인덱싱 → 검색/답변 품질 확인 (chunk size 800/overlap 100이 적절한지 튜닝)
- [ ] 검색 품질 낮을 경우 재랭킹(rerank) 도입 검토 — 사내 API 서버에 `bge-reranker-v2-m3` 등 리랭커 모델 확인해둠
- [ ] 평가용 질문-정답 세트 구축 → 리트리버 recall, 답변 품질 측정
- [ ] `main.py`의 `cmd_chat()`에서 Ctrl+C(KeyboardInterrupt) 시 traceback 없이 깔끔하게 종료되도록 처리
