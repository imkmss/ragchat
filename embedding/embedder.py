"""Ollama로 로컬 서빙 중인 Qwen3-Embedding-0.6B 래퍼.

주의: 쿼리(질문)는 instruction prefix를 붙여서 인코딩하고,
문서(청크)는 prefix 없이 그대로 인코딩해야 검색 성능이 제대로 나온다.
"""

import requests

import config

_EMBED_URL = f"{config.OLLAMA_BASE_URL}/api/embed"


def _encode(texts: list[str]) -> list[list[float]]:
    response = requests.post(
        _EMBED_URL,
        json={"model": config.EMBEDDING_API_MODEL, "input": texts},
        timeout=60,
    )
    response.raise_for_status()
    return response.json()["embeddings"]


def embed_documents(texts: list[str]) -> list[list[float]]:
    return _encode(texts)


def embed_query(query: str) -> list[float]:
    instructed = f"Instruct: {config.QUERY_INSTRUCTION}\nQuery: {query}"
    return _encode([instructed])[0]
