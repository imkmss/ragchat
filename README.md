# ragchat
- Python 3.11
- [Ollama](https://ollama.com) — 임베딩 모델을 로컬에서 서빙하는 데 사용

## 설치

```bash
git clone https://github.com/imkmss/ragchat.git
cd ragchatV

uv venv --python 3.11
source .venv/bin/activate
uv pip install -r requirements.txt
```
## 실행 방법

```bash
# Ollama 앱 실행 중이어야 함 (임베딩 + 로컬 폴백용)
ollama pull qwen3-embedding:0.6b            # 임베딩 모델 (최초 1회, ~639MB)
ollama create qwen3-8b-local -f Modelfile   # 로컬 폴백용 생성 모델 (최초 1회)

uv venv --python 3.11
source .venv/bin/activate
uv pip install -r requirements.txt

python main.py index ./data     # data 폴더의 pdf/docx 인덱싱
python main.py search <질문>     # top-k 검색 결과만 확인
python main.py chat             # 대화형 질의응답 (검색 + 생성, 스트리밍)

# 백엔드
uvicorn server:app --reload --port 8000

# 프론트엔드
cd ui && npm install && npm run dev   # http://localhost:5173
```

(`192.168.123.60:8081`) 접속이 안 되는 환경(회사 밖, VPN 미접속)에서도 로컬 폴백으로
생성은 계속 동작하지만, 속도/품질은 사내망 모델보다 떨어진다.