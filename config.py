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
TOP_K = 5
# 코사인 거리가 이 값보다 크면 "관련 없음"으로 보고 프롬프트/출처에서 제외한다.
# (임베딩 모델/문서 특성에 따라 튜닝 필요 — 관찰된 값 기준: 관련 있는 매치는 대략 0.2~0.3, 관련 없는 매치는 0.6대)
RELEVANCE_DISTANCE_THRESHOLD = 0.5

# --- Generation ---
GENERATION_MODEL = "qwen3-8b-local"  # ollama create로 로컬 gguf를 import한 모델명
