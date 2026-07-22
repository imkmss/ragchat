"""생성 모델 호출.

기본은 사내망 llama.cpp 서버(OpenAI 호환 API). 연결 자체가 안 되면(회사 밖 등)
GENERATION_CONNECT_TIMEOUT 안에 감지해서 로컬 Ollama(qwen3-8b-local)로 자동 폴백한다.
"""

from __future__ import annotations

import json
from collections.abc import Iterator

import requests

import config

_REMOTE_CHAT_URL = f"{config.GENERATION_BASE_URL}/v1/chat/completions"
_LOCAL_CHAT_URL = f"{config.LOCAL_GENERATION_BASE_URL}/api/chat"
_SSE_DONE = "[DONE]"


def _stream_remote(messages: list[dict], stats: dict | None, enable_thinking: bool) -> Iterator[str]:
    """사내망 llama.cpp 서버 (OpenAI 호환 SSE)."""
    payload = {
        "model": config.GENERATION_MODEL,
        "messages": messages,
        "stream": True,
        "temperature": config.GENERATION_TEMPERATURE,
        "chat_template_kwargs": {"enable_thinking": enable_thinking},
    }
    # connect timeout을 짧게 둬서, 사내망에 아예 연결이 안 되는 상황(회사 밖 등)을
    # 빠르게 실패시켜 로컬 폴백으로 넘어갈 수 있게 한다.
    with requests.post(
        _REMOTE_CHAT_URL,
        json=payload,
        stream=True,
        timeout=(config.GENERATION_CONNECT_TIMEOUT, 120),
    ) as response:
        response.raise_for_status()
        for raw_line in response.iter_lines():
            if not raw_line:
                continue
            line = raw_line.decode("utf-8")
            if not line.startswith("data: "):
                continue
            data = line[len("data: ") :]
            if data == _SSE_DONE:
                break

            chunk = json.loads(data)
            choice = chunk["choices"][0]
            content = choice.get("delta", {}).get("content")
            if content:
                yield content

            if choice.get("finish_reason") and stats is not None:
                timings = chunk.get("timings", {})
                stats["tokens"] = timings.get("predicted_n", 0)
                stats["tokens_per_second"] = round(timings.get("predicted_per_second", 0), 2)


def _stream_local(messages: list[dict], stats: dict | None) -> Iterator[str]:
    """로컬 Ollama (NDJSON)."""
    payload = {
        "model": config.LOCAL_GENERATION_MODEL,
        "messages": messages,
        "stream": True,
        "options": {"temperature": config.GENERATION_TEMPERATURE},
    }
    with requests.post(_LOCAL_CHAT_URL, json=payload, stream=True, timeout=120) as response:
        response.raise_for_status()
        for raw_line in response.iter_lines():
            if not raw_line:
                continue
            chunk = json.loads(raw_line.decode("utf-8"))
            content = chunk.get("message", {}).get("content")
            if content:
                yield content
            if chunk.get("done"):
                if stats is not None:
                    eval_count = chunk.get("eval_count", 0)
                    eval_duration_ns = chunk.get("eval_duration", 0)
                    stats["tokens"] = eval_count
                    stats["tokens_per_second"] = (
                        round(eval_count / (eval_duration_ns / 1e9), 2) if eval_duration_ns else 0
                    )
                break


def generate_answer_stream(
    messages: list[dict], stats: dict | None = None, enable_thinking: bool = False
) -> Iterator[str]:
    """stats를 넘기면, 스트림이 끝난 뒤(제너레이터를 다 소진한 뒤) 그 dict에
    {"tokens": ..., "tokens_per_second": ...}가 채워진다.

    enable_thinking은 원격 llama.cpp 서버에서만 지원된다(로컬 Ollama 폴백은 항상
    non-thinking으로 동작).
    """
    try:
        yield from _stream_remote(messages, stats, enable_thinking)
    except (requests.exceptions.ConnectionError, requests.exceptions.Timeout):
        # 사내망 서버에 연결 자체가 안 되는 경우(회사 밖, VPN 미접속 등)만 폴백한다.
        # 스트림 도중 끊기는 경우는 이미 토큰이 나간 뒤라 폴백하지 않고 그대로 에러 처리한다.
        print(f"[llm] {config.GENERATION_BASE_URL} 연결 실패 — 로컬 Ollama로 폴백")
        yield from _stream_local(messages, stats)


_TITLE_SYSTEM_PROMPT = (
    "사용자 질문의 핵심 주제를 한국어 명사구로 짧게(2~6단어) 요약해라. "
    "설명, 문장부호, 따옴표 없이 주제만 출력해라."
)
_TITLE_MAX_TOKENS = 20


def _title_messages(question: str) -> list[dict]:
    return [
        {"role": "system", "content": _TITLE_SYSTEM_PROMPT},
        {"role": "user", "content": question},
    ]


def generate_title(question: str) -> str:
    """채팅 제목용으로, 질문 전체가 아니라 핵심 주제만 짧게 뽑아낸다. (스트리밍 없이 한 번에 응답)"""
    messages = _title_messages(question)
    try:
        return _generate_title_remote(messages)
    except (requests.exceptions.ConnectionError, requests.exceptions.Timeout):
        return _generate_title_local(messages)


def _generate_title_remote(messages: list[dict]) -> str:
    payload = {
        "model": config.GENERATION_MODEL,
        "messages": messages,
        "stream": False,
        "temperature": 0.2,
        "max_tokens": _TITLE_MAX_TOKENS,
    }
    response = requests.post(
        _REMOTE_CHAT_URL, json=payload, timeout=(config.GENERATION_CONNECT_TIMEOUT, 30)
    )
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"].strip()


def _generate_title_local(messages: list[dict]) -> str:
    payload = {
        "model": config.LOCAL_GENERATION_MODEL,
        "messages": messages,
        "stream": False,
        "options": {"temperature": 0.2, "num_predict": _TITLE_MAX_TOKENS},
    }
    response = requests.post(_LOCAL_CHAT_URL, json=payload, timeout=30)
    response.raise_for_status()
    return response.json()["message"]["content"].strip()
