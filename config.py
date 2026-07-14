from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

# --- Ingestion / Chunking ---
DATA_DIR = BASE_DIR / "data"
CHUNK_SIZE_TOKENS = 300
CHUNK_OVERLAP_TOKENS = 50

# --- Ollama (임베딩 + 생성 공용 로컬 API) ---
OLLAMA_BASE_URL = "http://127.0.0.1:11434"

# --- Embedding ---
EMBEDDING_API_MODEL = "qwen3-embedding:0.6b"
EMBEDDING_TOKENIZER_NAME = "Qwen/Qwen3-Embedding-0.6B"  # 청킹 시 토큰 길이 계산용 (로컬, 토크나이저만 사용)
QUERY_INSTRUCTION = "Given a question, retrieve relevant passages that answer the question"

# --- Vector store ---
CHROMA_PERSIST_DIR = str(BASE_DIR / "chroma_db")
COLLECTION_NAME = "documents"

# --- Retrieval ---
TOP_K = 10
# 코사인 거리가 이 값보다 크면 "관련 없음"으로 보고 프롬프트/출처에서 제외한다.
# (임베딩 모델/문서 특성에 따라 튜닝 필요 — 관찰된 값 기준: 관련 있는 매치는 대략 0.2~0.3, 관련 없는 매치는 0.6대)
RELEVANCE_DISTANCE_THRESHOLD = 0.5

# --- Generation ---
# 기본은 사내망의 llama.cpp 서버(OpenAI 호환 API). 사내망(192.168.123.60)에 연결이
# 안 되면(예: 회사 밖, VPN 미접속) GENERATION_CONNECT_TIMEOUT 안에 실패를 감지해서
# 로컬 Ollama(qwen3-8b-local)로 자동 폴백한다.
GENERATION_BASE_URL = "http://192.168.123.60:8081"
GENERATION_MODEL = "Qwen3.6-35B-A3B-UD-Q4_K_XL.gguf"
GENERATION_CONNECT_TIMEOUT = 3  # 초. 이 안에 연결 안 되면 로컬로 전환

LOCAL_GENERATION_BASE_URL = OLLAMA_BASE_URL  # 로컬 Ollama, 임베딩과 같은 서버
LOCAL_GENERATION_MODEL = "qwen3-8b-local"  # ollama create로 로컬 gguf를 import한 모델명

GENERATION_TEMPERATURE = 0.2  # 낮을수록 답변이 결정적(일관적)이 됨. 기본값(0.8)은 매번 판단이 흔들림
