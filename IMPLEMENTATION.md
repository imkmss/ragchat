# RAG 검색 구현 정리

## 전체 파이프라인 (현재: 검색까지만 구현)

```
문서 입력(PDF/DOCX)
  → 파싱 (PyMuPDF / python-docx)
  → 청킹 (토큰 길이 기준)
  → 임베딩 (Qwen3-Embedding-0.6B, Ollama 로컬 API)
  → 벡터 저장 (ChromaDB)
  → [질의 시점]
  → 질문 임베딩 → 리트리버 top-5 검색 → 결과 출력
```

**생성(LLM 답변 합성) 단계는 현재 제거된 상태.** 검색된 청크를 그대로 보여주는 데까지만
구현되어 있고, 답변 생성/서빙 방식은 추후 재설계 예정 (아래 "남은 작업" 참고).

## 기술 스택 결정 사항

| 단계 | 선택 | 비고 |
|---|---|---|
| PDF 파싱 | PyMuPDF (`fitz`) | 페이지 단위 텍스트 + 페이지 번호 메타데이터 추출 |
| DOCX 파싱 | python-docx | 문단 단위 텍스트 결합 |
| 청킹 | langchain-text-splitters (`RecursiveCharacterTextSplitter`) | length_function을 Qwen3-Embedding 토크나이저 기준으로 맞춤 |
| 임베딩 | Qwen3-Embedding-0.6B (Ollama 로컬 API) | `ollama pull qwen3-embedding:0.6b` 후 `http://127.0.0.1:11434/api/embed` 호출 |
| 벡터DB | ChromaDB (파일 기반, PersistentClient) | 별도 서버 없이 로컬 구동 |
| 생성 LLM | (미구현, 제거됨) | 원래 Qwen3-8B/Ollama 계획이었으나 리트리버 단계로 되돌리며 제거. 재설계 예정 |
| top-k | 5 | 사용자 요구사항 |

### 임베딩 방식 변경 이력

같은 세션 안에서 임베딩 서빙 방식을 세 번 바꿨다 (모두 `embedding/embedder.py` 한 파일만
교체하면 되는 구조 — 검색/벡터DB 등 나머지 코드는 무관):

1. **로컬 sentence-transformers** (최초) — `Qwen/Qwen3-Embedding-0.6B`를 파이썬 프로세스 안에서 직접 로드/추론 (MPS 사용)
2. **사내망 BGE-M3 API** (중간 실험) — `http://192.168.123.60:18003`의 BGE-M3 모델 호출. 네트워크가 끊기면 못 쓰는 문제로 보류
3. **Ollama 로컬 API** (현재) — 이 맥북에 Ollama를 네이티브 설치하고 `qwen3-embedding:0.6b`를 pull, `http://127.0.0.1:11434/api/embed`로 호출. 로컬 완결 + 원래 계획했던 Qwen3-Embedding 모델 유지라는 두 조건을 다 만족해서 채택

## 왜 이렇게 결정했는가

- **임베딩 0.6B**: 임베딩은 텍스트를 벡터로 바꾸는 상대적으로 단순한 작업이라 작은 모델로도 검색 성능이 잘 나옴
- **Ollama로 서빙**: sentence-transformers로 직접 로드하는 대신 Ollama API 호출 방식을 쓰면, 나중에 생성(LLM) 모델도 같은 방식(HTTP API)으로 붙일 수 있어 구조가 일관됨. llama.cpp(`llama-server`)도 같은 이유로 생성 쪽에 써본 적 있음 (현재는 생성 자체가 제거된 상태)
- **쿼리/문서 임베딩 분리**: Qwen3-Embedding은 검색 시 쿼리에 instruction prefix(`"Instruct: ...\nQuery: ..."`)를 붙여야 성능이 제대로 나오고, 문서(청크)는 prefix 없이 인코딩해야 함 → `embedder.py`에서 `embed_query()` / `embed_documents()`로 함수 분리
- **동일 임베딩 모델 고정**: 인덱싱과 질의에서 다른 임베딩 모델을 쓰면 벡터 공간이 어긋나 검색이 깨지므로, 임베딩 모델을 바꿀 때마다 `chroma_db`를 반드시 초기화하고 재인덱싱해야 함

## 프로젝트 구조

```
ragchat/
├── requirements.txt
├── config.py                    # 임베딩 API 주소/모델명, chunk size, top_k 등 중앙 설정
├── ingestion/
│   ├── loaders.py                # PDF/DOCX → 텍스트 + 메타데이터(source, page)
│   └── chunker.py                # Qwen3-Embedding 토크나이저 기준 토큰 청킹
├── embedding/
│   └── embedder.py               # Ollama qwen3-embedding:0.6b 호출, embed_documents()/embed_query() 분리
├── vectorstore/
│   └── store.py                  # ChromaDB upsert/search
├── retrieval/
│   └── retriever.py              # 질문 → 임베딩 → top-5 검색
├── pipeline/
│   └── index_pipeline.py         # 문서 → 파싱 → 청킹 → 임베딩 → 저장
├── models/
│   └── Qwen3-8B-Q4_K_M.gguf      # 생성 모델 재설계 시 쓸 예정으로 남겨둔 파일 (현재 미사용)
└── main.py                        # CLI: index / search
```

`generation/`, `pipeline/query_pipeline.py`, `server.py`는 생성 단계를 리트리버 단계로
되돌리며 삭제함.

## 환경 세팅 이력

- 시스템 기본 Python은 3.9.6 → 최신 라이브러리 호환 위해 Homebrew로 Python 3.11 설치
- `venv/` 가상환경을 Python 3.11로 생성 후 `requirements.txt` 설치
- VSCode 인터프리터를 `/Users/myseo/ragchat/venv/bin/python`으로 지정 완료
- Ollama는 Homebrew(`brew install ollama`)가 아니라 `/Applications/Ollama.app` 네이티브 앱으로 설치, 기본적으로 `127.0.0.1:11434`에서 백그라운드 서비스로 상시 구동
- 로컬 임베딩 추론이 없어지면서 `requirements.txt`에서 `sentence-transformers`/`torch` 제거 (청킹용 토크나이저 때문에 `transformers`는 유지)

## 실행 방법

```bash
# Ollama 앱이 실행 중이어야 함 (메뉴바에 아이콘 확인, 없으면 /Applications/Ollama.app 실행)
ollama pull qwen3-embedding:0.6b   # 임베딩 모델 최초 1회 다운로드 (~639MB)

source venv/bin/activate
python main.py index ./data        # data 폴더의 pdf/docx 인덱싱
python main.py search <질문>        # top-5 검색 결과 출력
```

## 남은 작업 / 향후 고려사항

- [ ] 생성(LLM 답변 합성) 단계 재설계 및 구현 — 서빙 방식(로컬 llama.cpp/Ollama vs 원격 API) 재검토 필요
- [ ] UI 구현 (React + Vite + Tailwind 예정, `llamacpp-ui-style` 스킬 참고 가능)
- [ ] 실제 문서로 인덱싱 → 검색 품질 확인 (chunk size 800/overlap 100이 적절한지 튜닝)
- [ ] 검색 품질 낮을 경우 재랭킹(rerank) 도입 검토 — 사내 API 서버에 `bge-reranker-v2-m3` 등 리랭커 모델 확인해둠
- [ ] 평가용 질문-정답 세트 구축 → 리트리버 recall 측정
