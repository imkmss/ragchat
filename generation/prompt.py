"""검색된 청크 + 질문 -> LLM에 넣을 프롬프트 구성."""

SYSTEM_PROMPT = (
    "너는 주어진 문서 컨텍스트를 기반으로 답변하는 어시스턴트다. "
    "컨텍스트에 없는 내용은 답하지 말고, 근거가 없으면 '문서에서 답을 찾을 수 없습니다'라고 답하라. "
    "답변 뒤에 참고한 출처(파일명, 페이지)를 표시하라."
)


def build_context(hits: list[dict]) -> str:
    blocks = []
    for i, hit in enumerate(hits, start=1):
        source = hit["metadata"].get("source", "unknown")
        page = hit["metadata"].get("page")
        location = f"p.{page}" if page is not None else source
        blocks.append(f"[{i}] (출처: {location})\n{hit['text']}")
    return "\n\n".join(blocks)


def build_messages(question: str, hits: list[dict]) -> list[dict]:
    context = build_context(hits)
    user_prompt = f"컨텍스트:\n{context}\n\n질문: {question}"
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]
