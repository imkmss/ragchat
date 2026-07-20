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


def search(query_embedding: list[float], top_k: int, project_id: str) -> list[dict]:
    result = _collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        where={"project_id": project_id},
    )
    hits = []
    for text, metadata, distance in zip(
        result["documents"][0], result["metadatas"][0], result["distances"][0]
    ):
        hits.append({"text": text, "metadata": metadata, "distance": distance})
    return hits


def list_documents(project_id: str) -> list[dict]:
    """특정 프로젝트에 속한 문서 목록을 doc_id별로(source, 청크 개수와 함께) 반환."""
    result = _collection.get(where={"project_id": project_id}, include=["metadatas"])
    docs: dict[str, dict] = {}
    for metadata in result["metadatas"]:
        doc_id = metadata["doc_id"]
        if doc_id not in docs:
            docs[doc_id] = {"doc_id": doc_id, "source": metadata.get("source", "unknown"), "chunks": 0}
        docs[doc_id]["chunks"] += 1
    return sorted(docs.values(), key=lambda d: d["source"])


def get_document_chunks(doc_id: str) -> list[dict]:
    """특정 문서(doc_id)에 속한 청크를 id/텍스트/메타데이터와 함께 반환."""
    result = _collection.get(where={"doc_id": doc_id}, include=["documents", "metadatas"])
    chunks = [
        {"id": id_, "text": text, "metadata": metadata}
        for id_, text, metadata in zip(result["ids"], result["documents"], result["metadatas"])
    ]
    chunks.sort(key=lambda c: c["metadata"].get("chunk_index", 0))
    return chunks


def delete_document(doc_id: str) -> int:
    """특정 문서(doc_id)에 속한 청크를 전부 삭제. 삭제된 청크 개수를 반환 (0이면 못 찾음)."""
    result = _collection.get(where={"doc_id": doc_id}, include=[])
    ids_to_delete = result["ids"]
    if ids_to_delete:
        _collection.delete(ids=ids_to_delete)
    return len(ids_to_delete)
