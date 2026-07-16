"""문서 입력 -> 파싱 -> 청킹 -> 임베딩 -> 벡터DB 저장 (오프라인 인덱싱).

index_document()가 메모리 상의 바이트를 바로 처리하는 핵심 함수다. index_file()/
index_directory()는 이미 디스크에 있는 파일(CLI 용도)을 읽어서 index_document()로
넘기는 얇은 래퍼일 뿐이다.
"""

from __future__ import annotations

from pathlib import Path

from embedding.embedder import embed_documents
from ingestion.chunker import chunk_pages
from ingestion.loaders import load_document
from vectorstore.store import upsert

SUPPORTED_SUFFIXES = {".pdf", ".docx"}


def index_document(data: bytes, filename: str) -> int:
    pages = load_document(data, filename)
    chunks = chunk_pages(pages)
    if not chunks:
        return 0

    texts = [c.text for c in chunks]
    embeddings = embed_documents(texts)
    ids = [c.id for c in chunks]
    metadatas = [c.metadata for c in chunks]

    upsert(ids=ids, embeddings=embeddings, texts=texts, metadatas=metadatas)
    return len(chunks)


def index_file(path: str | Path) -> int:
    path = Path(path)
    return index_document(path.read_bytes(), path.name)


def index_directory(dir_path: str | Path) -> None:
    dir_path = Path(dir_path)
    files = [p for p in dir_path.rglob("*") if p.suffix.lower() in SUPPORTED_SUFFIXES]
    for path in files:
        count = index_file(path)
        print(f"[indexed] {path.name}: {count} chunks")
