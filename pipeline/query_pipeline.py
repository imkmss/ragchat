"""질문 -> 리트리버 top-5 -> 프롬프트 구성 -> LLM(스트리밍) -> 답변(+출처)."""

from __future__ import annotations

from collections.abc import Iterator

import config
from generation.llm import generate_answer_stream
from generation.prompt import build_messages
from retrieval.retriever import retrieve


def answer_question_stream(
    question: str,
    top_k: int = config.TOP_K,
    history: list[dict] | None = None,
    project_id: str | None = None,
) -> tuple[list[dict], Iterator[str], dict]:
    hits = retrieve(question, project_id, top_k=top_k)
    # 관련성 낮은(코사인 거리가 큰) 결과는 프롬프트/출처 양쪽에서 제외한다.
    # 이렇게 해야 "찾은 척"하지 않고, 실제로 근거로 쓴 문서만 출처로 표시된다.
    relevant_hits = [h for h in hits if h["distance"] <= config.RELEVANCE_DISTANCE_THRESHOLD]

    messages = build_messages(question, relevant_hits, history)
    sources = [
        {"source": h["metadata"].get("source"), "page": h["metadata"].get("page")}
        for h in relevant_hits
    ]
    # generate_answer_stream()을 끝까지 소진한 뒤에야 stats가 채워진다.
    stats: dict = {}
    return sources, generate_answer_stream(messages, stats), stats
