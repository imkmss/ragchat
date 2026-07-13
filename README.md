# ragchat
- Python 3.11
- [Ollama](https://ollama.com) — 임베딩 모델을 로컬에서 서빙하는 데 사용

## 설치

```bash
git clone https://github.com/imkmss/ragchat.git
cd ragchat

uv venv --python 3.11
source .venv/bin/activate
uv pip install -r requirements.txt
```

## 임베딩 모델 준비

Ollama 앱이 실행 중인지 확인하고(`http://127.0.0.1:11434`에서 상시 구동), 임베딩 모델을 한 번 받아둔다.

```bash
ollama pull qwen3-embedding:0.6b
```

## 사용법

### 1. 문서 인덱싱

`data/` 폴더에 PDF/DOCX 파일을 넣고 인덱싱한다.

```bash
python main.py index ./data
```

### 2. 검색

```bash
python main.py search "여기에 질문을 입력"
```

관련도가 높은 순으로 top-5 문서 조각과 출처(파일명, 페이지)를 보여준다.

## 어떻게 동작하는가

```
문서(PDF/DOCX)
  → 파싱 (PyMuPDF / python-docx)
  → 청킹 (토큰 길이 기준, 800/100 overlap)
  → 임베딩 (Qwen3-Embedding-0.6B, Ollama 로컬 API)
  → 저장 (ChromaDB)
      ↓ 질문 시
  → 질문 임베딩 → 코사인 유사도 top-5 검색 → 결과 출력
```

| 구성 요소 | 위치 |
|---|---|
| 문서 파싱/청킹 | `ingestion/` |
| 임베딩 호출 | `embedding/embedder.py` |
| 벡터 저장/검색 | `vectorstore/store.py` |
| 검색 로직 | `retrieval/retriever.py` |
| 인덱싱 파이프라인 | `pipeline/index_pipeline.py` |
| 설정값 | `config.py` |

더 자세한 설계 배경과 결정 이유는 [IMPLEMENTATION.md](./IMPLEMENTATION.md)에 정리되어 있다.

## 남은 작업

- [ ] 답변 생성(LLM) 단계 재설계
- [ ] 웹 UI
