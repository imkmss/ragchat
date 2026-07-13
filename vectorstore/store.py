"""ChromaDB 래퍼. 임베딩은 embedding/embedder.py에서 미리 계산해서 넣는다."""

import unicodedata

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


def list_documents() -> list[dict]:
    """인덱싱된 문서 목록을 출처(source)별 청크 개수와 함께 반환."""
    result = _collection.get(include=["metadatas"])
    counts: dict[str, int] = {}
    for metadata in result["metadatas"]:
        source = metadata.get("source", "unknown")
        counts[source] = counts.get(source, 0) + 1
    return [{"source": source, "chunks": count} for source, count in sorted(counts.items())]


def get_document_chunks(source: str) -> list[dict]:
    """특정 문서(source)에 속한 청크를 id/텍스트/메타데이터와 함께 반환.

    macOS 파일시스템은 한글 파일명을 NFD(분해형)로 반환하는데, URL/JSON으로 들어오는 값은
    보통 NFC(조합형)라 chromadb의 where 정확 매칭이 실패한다. 그래서 전체를 가져온 뒤
    NFC로 정규화해서 직접 비교한다.
    """
    target = unicodedata.normalize("NFC", source)
    result = _collection.get(include=["documents", "metadatas"])
    chunks = [
        {"id": id_, "text": text, "metadata": metadata}
        for id_, text, metadata in zip(result["ids"], result["documents"], result["metadatas"])
        if unicodedata.normalize("NFC", metadata.get("source", "")) == target
    ]
    chunks.sort(key=lambda c: c["metadata"].get("chunk_index", 0))
    return chunks


def delete_document(source: str) -> int:
    """특정 문서(source)에 속한 청크를 전부 삭제. 삭제된 청크 개수를 반환 (0이면 못 찾음)."""
    target = unicodedata.normalize("NFC", source)
    result = _collection.get(include=["metadatas"])
    ids_to_delete = [
        id_
        for id_, metadata in zip(result["ids"], result["metadatas"])
        if unicodedata.normalize("NFC", metadata.get("source", "")) == target
    ]
    if ids_to_delete:
        _collection.delete(ids=ids_to_delete)
    return len(ids_to_delete)
