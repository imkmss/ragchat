"""질문 -> 임베딩 -> 벡터DB 검색 -> 상위 top_k 청크.

project_id가 없는(미분류) 채팅은 검색할 문서가 없다는 뜻이라 바로 빈 결과를 반환한다
(프로젝트 안 채팅은 그 프로젝트 문서만 검색하도록 격리되어 있음).
"""

import config
from embedding.embedder import embed_query
from vectorstore.store import search


def retrieve(question: str, project_id: str | None, top_k: int = config.TOP_K) -> list[dict]:
    if not project_id:
        return []
    query_embedding = embed_query(question)
    return search(query_embedding, top_k, project_id)
