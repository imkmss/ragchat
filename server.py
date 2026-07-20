"""RAG 파이프라인을 HTTP API로 노출. UI는 이 API를 호출해서 사용.

실행:
  uvicorn server:app --reload --port 8000
"""

from __future__ import annotations

import json
from pathlib import Path

import requests
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

import config
from generation.llm import generate_title
from pipeline.index_pipeline import SUPPORTED_SUFFIXES, index_directory, index_document
from pipeline.query_pipeline import answer_question_stream
from vectorstore.store import delete_document, get_document_chunks, list_documents

app = FastAPI(title="RAG Chat API")

# 로컬 개발 중 다른 origin(UI dev server)에서 호출할 수 있도록 전체 허용.
# 배포 시에는 allow_origins를 UI 도메인으로 좁혀야 함.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    question: str
    top_k: int = config.TOP_K
    history: list[Message] = []
    # 프로젝트 안 채팅만 그 프로젝트 문서를 검색한다. 없으면(미분류 채팅) 검색을 아예 건너뛴다.
    project_id: str | None = None


class IndexRequest(BaseModel):
    path: str


class TitleRequest(BaseModel):
    question: str


def _sse(event: dict) -> str:
    return f"data: {json.dumps(event, ensure_ascii=False)}\n\n"


@app.post("/chat")
def chat(req: ChatRequest) -> StreamingResponse:
    def event_stream():
        history = [m.model_dump() for m in req.history]
        sources, token_stream, stats = answer_question_stream(
            req.question, top_k=req.top_k, history=history, project_id=req.project_id
        )
        yield _sse({"type": "sources", "data": sources})
        try:
            for token in token_stream:
                yield _sse({"type": "token", "data": token})
        except requests.exceptions.RequestException as e:
            yield _sse({"type": "error", "data": str(e)})
            return
        yield _sse({"type": "done", "data": stats})

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.post("/title")
def title(req: TitleRequest) -> dict:
    return {"title": generate_title(req.question)}


@app.post("/index")
def index(req: IndexRequest) -> dict:
    index_directory(req.path)
    return {"status": "ok"}


@app.post("/upload")
def upload(file: UploadFile = File(...), project_id: str = Form(...)) -> dict:
    suffix = Path(file.filename).suffix.lower()
    if suffix not in SUPPORTED_SUFFIXES:
        raise HTTPException(status_code=400, detail=f"지원하지 않는 파일 형식: {suffix}")
    if not project_id:
        raise HTTPException(status_code=400, detail="프로젝트를 먼저 선택해야 문서를 업로드할 수 있습니다")

    # 디스크에 안 쓰고 업로드된 바이트를 그대로 파싱한다 — 인덱싱이 끝나면
    # ChromaDB에 검색 가능한 내용이 다 들어가므로 원본 파일을 남겨둘 필요가 없다.
    data = file.file.read()
    result = index_document(data, file.filename, project_id)
    return {"filename": file.filename, **result}


@app.get("/documents")
def documents(project_id: str) -> list[dict]:
    return list_documents(project_id)


@app.get("/documents/{doc_id}")
def document_detail(doc_id: str) -> list[dict]:
    chunks = get_document_chunks(doc_id)
    if not chunks:
        raise HTTPException(status_code=404, detail=f"문서를 찾을 수 없음: {doc_id}")
    return chunks


@app.delete("/documents/{doc_id}")
def delete_document_endpoint(doc_id: str) -> dict:
    deleted = delete_document(doc_id)
    if deleted == 0:
        raise HTTPException(status_code=404, detail=f"문서를 찾을 수 없음: {doc_id}")
    return {"doc_id": doc_id, "deleted_chunks": deleted}


@app.get("/models")
def models() -> dict:
    return {
        "embedding": config.EMBEDDING_API_MODEL,
        "generation": config.GENERATION_MODEL,
    }


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
