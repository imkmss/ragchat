"""질문 -> 임베딩 -> 벡터DB 검색 -> 상위 top_k 청크."""

import config
from embedding.embedder import embed_query
from vectorstore.store import search


def retrieve(question: str, top_k: int = config.TOP_K) -> list[dict]:
    query_embedding = embed_query(question)
    return search(query_embedding, top_k)
