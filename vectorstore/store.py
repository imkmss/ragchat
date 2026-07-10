"""ChromaDB 래퍼. 임베딩은 embedding/embedder.py에서 미리 계산해서 넣는다."""

import chromadb

import config

_client = chromadb.PersistentClient(path=config.CHROMA_PERSIST_DIR)
_collection = _client.get_or_create_collection(
    name=config.COLLECTION_NAME,
    metadata={"hnsw:space": "cosine"},
)


def upsert(ids: list[str], embeddings: list[list[float]], texts: list[str], metadatas: list[dict]) -> None:
    _collection.upsert(
        ids=ids,
        embeddings=embeddings,
        documents=texts,
        metadatas=metadatas,
    )


def search(query_embedding: list[float], top_k: int) -> list[dict]:
    result = _collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
    )
    hits = []
    for text, metadata, distance in zip(
        result["documents"][0], result["metadatas"][0], result["distances"][0]
    ):
        hits.append({"text": text, "metadata": metadata, "distance": distance})
    return hits
