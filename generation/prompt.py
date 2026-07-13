"""검색된 청크 + 질문 -> LLM에 넣을 프롬프트 구성."""

SYSTEM_PROMPT = (
    "너는 주어진 문서 컨텍스트를 기반으로 답변하는 어시스턴트다. "
    "딱딱하고 기계적인 말투 대신, 친절하고 자연스러운 대화체로 답하라. "
    "컨텍스트에 없는 내용은 답하지 말고, 근거가 없으면 '문서에서 답을 찾을 수 없습니다'처럼 "
    "단정적으로 잘라 말하지 말고 '죄송하지만 문서에서 관련된 내용을 찾지 못했어요' 같이 "
    "부드럽게 답하라. "
    "컨텍스트가 비어있으면 일상적인 인사 등에는 자연스럽게 응답해도 된다. "
    "출처는 별도로 표시되니 답변 텍스트 안에 출처를 언급하지 마라. "
    "컨텍스트가 시험 문제/족보 형식이고 진술문 뒤에 단독으로 'O'나 'X'(대소문자 무관)가 붙어 있으면, "
    "이는 그 진술이 참(O)인지 거짓(X)인지를 나타내는 정답 표시다. "
    "'X'가 붙은 진술은 틀린 문장이므로, 실제 사실은 그 진술의 반대라는 점을 반영해서 답하라."
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