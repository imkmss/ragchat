"""질문 -> 리트리버 top-5 -> 프롬프트 구성 -> LLM(스트리밍) -> 답변(+출처)."""

from __future__ import annotations

from collections.abc import Iterator

import config
from generation.llm import generate_answer_stream
from generation.prompt import build_messages
from retrieval.retriever import retrieve


def answer_question_stream(
    question: str, top_k: int = config.TOP_K
) -> tuple[list[dict], Iterator[str]]:
    hits = retrieve(question, top_k=top_k)
    messages = build_messages(question, hits)
    sources = [
        {"source": h["metadata"].get("source"), "page": h["metadata"].get("page")}
        for h in hits
    ]
    return sources, generate_answer_stream(messages)
