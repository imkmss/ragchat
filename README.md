# ragchat

PDF/DOCX 문서를 업로드하면 그 내용을 기반으로 답변하는 로컬 RAG 챗봇.

## 준비물

- Python 3.11
- Node.js (프론트엔드 실행용)
- [uv](https://github.com/astral-sh/uv) — Python 패키지 매니저
- [Ollama](https://ollama.com) — 임베딩 모델(및 생성 모델 폴백)을 로컬에서 서빙

## 설치

```bash
git clone https://github.com/imkmss/ragchat.git
cd ragchat

# 백엔드
uv venv --python 3.11
source .venv/bin/activate
uv pip install -r requirements.txt

# 프론트엔드
cd ui && npm install && cd ..
```

## 모델 준비 (최초 1회)

Ollama 앱이 실행 중이어야 합니다.

```bash
ollama pull qwen3-embedding:0.6b            # 임베딩 모델 (~639MB)
ollama create qwen3-8b-local -f Modelfile   # 생성 모델 로컬 폴백용
```

## 실행

터미널 2개(또는 백그라운드)로 백엔드와 프론트엔드를 각각 띄웁니다.

```bash
# 터미널 1: 백엔드
source .venv/bin/activate
uvicorn server:app --reload --port 8000

# 터미널 2: 프론트엔드
cd ui && npm run dev
```

브라우저에서 `http://localhost:5173` 접속.

## 사용법

1. 채팅창에 PDF/DOCX 파일을 드래그하거나 첨부 버튼으로 업로드하면 자동으로 인덱싱됩니다.
2. 업로드한 문서 내용에 대해 질문하면, 관련 내용을 찾아 답변합니다.
3. 좌측 사이드바에서 채팅을 프로젝트별로 묶어서 관리할 수 있습니다.

CLI로도 사용 가능합니다:

```bash
python main.py index ./data     # data 폴더의 pdf/docx 인덱싱
python main.py search <질문>     # 검색 결과만 확인
python main.py chat             # 터미널에서 대화
```

## 참고

- 답변 생성은 llama.cpp 서버를 우선 사용하고, 연결이 안 되면(회사 밖 등) 자동으로 로컬 모델로 전환됩니다.
- 구현 상세, 시스템 흐름도, 기술적 결정 배경은 [IMPLEMENTATION.md](./IMPLEMENTATION.md) 참고.
