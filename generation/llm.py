"""Ollama로 로컬 서빙 중인 생성 모델(Qwen3-8B) 호출."""

from __future__ import annotations

import json
from collections.abc import Iterator

import requests

import config

_CHAT_URL = f"{config.OLLAMA_BASE_URL}/api/chat"


def generate_answer_stream(messages: list[dict], stats: dict | None = None) -> Iterator[str]:
    """stats를 넘기면, 스트림이 끝난 뒤(제너레이터를 다 소진한 뒤) 그 dict에
    {"tokens": ..., "tokens_per_second": ...}가 채워진다.
    """
    payload = {
        "model": config.GENERATION_MODEL,
        "messages": messages,
        "stream": True,
        "options": {"temperature": config.GENERATION_TEMPERATURE},
    }
    with requests.post(_CHAT_URL, json=payload, stream=True, timeout=120) as response:
        response.raise_for_status()
        # 완성된 줄(bytes) 단위로만 utf-8 디코딩해서 멀티바이트(한글 등) 문자가
        # 네트워크 청크 경계에서 잘려 깨지는 걸 방지한다.
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