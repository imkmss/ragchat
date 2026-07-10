from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

# --- Ingestion / Chunking ---
CHUNK_SIZE_TOKENS = 800
CHUNK_OVERLAP_TOKENS = 100

# --- Embedding (Ollama 로컬 API) ---
EMBEDDING_API_URL = "http://127.0.0.1:11434"
EMBEDDING_API_MODEL = "qwen3-embedding:0.6b"
EMBEDDING_TOKENIZER_NAME = "Qwen/Qwen3-Embedding-0.6B"  # 청킹 시 토큰 길이 계산용 (로컬, 토크나이저만 사용)
QUERY_INSTRUCTION = "Given a question, retrieve relevant passages that answer the question"

# --- Vector store ---
CHROMA_PERSIST_DIR = str(BASE_DIR / "chroma_db")
COLLECTION_NAME = "documents"

# --- Retrieval ---
TOP_K = 5
