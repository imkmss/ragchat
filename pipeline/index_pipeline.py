"""문서 입력 -> 파싱 -> 청킹 -> 임베딩 -> 벡터DB 저장 (오프라인 인덱싱).

index_document()가 메모리 상의 바이트를 바로 처리하는 핵심 함수다. index_file()/
index_directory()는 이미 디스크에 있는 파일(CLI 용도)을 읽어서 index_document()로
넘기는 얇은 래퍼일 뿐이다.

문서마다 고유한 doc_id를 발급해서 청크 id/메타데이터에 심어둔다 — 같은 파일명이
다른 프로젝트에 있거나, 같은 문서를 재업로드해도 서로 충돌하지 않게 하기 위함.
"""

from __future__ import annotations

import uuid
from pathlib import Path

from embedding.embedder import embed_documents
from ingestion.chunker import chunk_pages
from ingestion.loaders import load_document
from vectorstore.store import upsert

SUPPORTED_SUFFIXES = {".pdf", ".docx"}

# CLI(main.py index)로 인덱싱할 때는 UI의 "프로젝트" 개념이 없어서 고정된 가상 프로젝트로 묶는다.
CLI_PROJECT_ID = "cli"


def index_document(data: bytes, filename: str, project_id: str) -> dict:
    doc_id = uuid.uuid4().hex
    pages = load_document(data, filename)
    chunks = chunk_pages(pages, doc_id=doc_id, project_id=project_id)
    if not chunks:
        return {"doc_id": doc_id, "chunks": 0}

    texts = [c.text for c in chunks]
    embeddings = embed_documents(texts)
    ids = [c.id for c in chunks]
    metadatas = [c.metadata for c in chunks]

    upsert(ids=ids, embeddings=embeddings, texts=texts, metadatas=metadatas)
    return {"doc_id": doc_id, "chunks": len(chunks)}


def index_file(path: str | Path, project_id: str = CLI_PROJECT_ID) -> int:
    path = Path(path)
    result = index_document(path.read_bytes(), path.name, project_id)
    return result["chunks"]


def index_directory(dir_path: str | Path, project_id: str = CLI_PROJECT_ID) -> None:
    dir_path = Path(dir_path)
    files = [p for p in dir_path.rglob("*") if p.suffix.lower() in SUPPORTED_SUFFIXES]
    for path in files:
        count = index_file(path, project_id)
        print(f"[indexed] {path.name}: {count} chunks")
