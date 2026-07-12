"""RAG 파이프라인을 HTTP API로 노출. UI는 이 API를 호출해서 사용.

실행:
  uvicorn server:app --reload --port 8000
"""

from __future__ import annotations

import json

import requests
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

import config
from pipeline.index_pipeline import index_directory
from pipeline.query_pipeline import answer_question_stream

app = FastAPI(title="RAG Chat API")

# 로컬 개발 중 다른 origin(UI dev server)에서 호출할 수 있도록 전체 허용.
# 배포 시에는 allow_origins를 UI 도메인으로 좁혀야 함.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    question: str
    top_k: int = config.TOP_K


class IndexRequest(BaseModel):
    path: str


def _sse(event: dict) -> str:
    return f"data: {json.dumps(event, ensure_ascii=False)}\n\n"


@app.post("/chat")
def chat(req: ChatRequest) -> StreamingResponse:
    def event_stream():
        sources, token_stream = answer_question_stream(req.question, top_k=req.top_k)
        yield _sse({"type": "sources", "data": sources})
        try:
            for token in token_stream:
                yield _sse({"type": "token", "data": token})
        except requests.exceptions.RequestException as e:
            yield _sse({"type": "error", "data": str(e)})
            return
        yield _sse({"type": "done"})

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.post("/index")
def index(req: IndexRequest) -> dict:
    index_directory(req.path)
    return {"status": "ok"}


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
