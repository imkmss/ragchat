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
    # "주제가 뭐야"/"내용 알려줘" 같은 질문은 실제 문서 내용과 벡터상 안 닮아서 거리가
    # 크게 나오는 게 정상이라, 임계값으로 LLM한테 보여줄지를 걸러버리면 이런 질문에
    # 답을 못 하게 된다. 그래서 LLM에게는 top_k개를 거르지 않고 그대로 보여주고 (관련
    # 없으면 시스템 프롬프트 지시에 따라 모델이 스스로 판단해서 답을 거절하게 한다),
    # 화면에 "출처"로 표시할지만 임계값으로 엄격하게 거른다 (엉뚱한 출처가 안 뜨도록).
    relevant_hits = [h for h in hits if h["distance"] <= config.RELEVANCE_DISTANCE_THRESHOLD]

    messages = build_messages(question, hits, history)
    sources = [
        {"source": h["metadata"].get("source"), "page": h["metadata"].get("page")}
        for h in relevant_hits
    ]
    # 문서 근거로 답해야 하는 상황(관련 있는 청크가 있을 때)에만 thinking 모드를 켠다 —
    # 문서 없는 일반 대화는 빠른 응답이 더 중요해서 그대로 둔다.
    enable_thinking = bool(relevant_hits)
    # generate_answer_stream()을 끝까지 소진한 뒤에야 stats가 채워진다.
    stats: dict = {}
    return sources, generate_answer_stream(messages, stats, enable_thinking=enable_thinking), stats
