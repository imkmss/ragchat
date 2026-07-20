"""RawPage 리스트 -> 임베딩 모델 토크나이저 기준으로 길이를 맞춘 청크 리스트.

페이지 단위로 따로 쪼개면 페이지 경계에 걸친 문장/문항이 서로 다른 청크로 잘려
맥락을 잃는 문제가 있어서, 문서 전체를 이어붙인 뒤 하나의 텍스트로 청킹한다.
페이지 번호는 각 청크가 시작하는 위치를 기준으로 근사해서 출처 표시에 사용한다.
"""

from dataclasses import dataclass, field

from langchain_text_splitters import RecursiveCharacterTextSplitter
from transformers import AutoTokenizer

import config
from ingestion.loaders import RawPage

_tokenizer = AutoTokenizer.from_pretrained(config.EMBEDDING_TOKENIZER_NAME)


def _token_length(text: str) -> int:
    return len(_tokenizer.encode(text, add_special_tokens=False))


_splitter = RecursiveCharacterTextSplitter(
    chunk_size=config.CHUNK_SIZE_TOKENS,
    chunk_overlap=config.CHUNK_OVERLAP_TOKENS,
    length_function=_token_length,
)


@dataclass
class Chunk:
    id: str
    text: str
    metadata: dict = field(default_factory=dict)


def chunk_pages(pages: list[RawPage], doc_id: str, project_id: str) -> list[Chunk]:
    if not pages:
        return []

    source = pages[0].metadata.get("source", "unknown")

    full_text = ""
    page_breaks: list[tuple[int, int | None]] = []  # (시작 offset, 페이지 번호)
    for page in pages:
        page_breaks.append((len(full_text), page.metadata.get("page")))
        full_text += page.text + "\n\n"

    def page_at(offset: int) -> int | None:
        page_no = page_breaks[0][1]
        for start, p in page_breaks:
            if start > offset:
                break
            page_no = p
        return page_no

    pieces = _splitter.split_text(full_text)

    chunks: list[Chunk] = []
    search_from = 0
    for i, piece in enumerate(pieces):
        offset = full_text.find(piece, search_from)
        if offset == -1:
            offset = full_text.find(piece)
        search_from = offset + 1

        # id를 파일명이 아니라 doc_id 기준으로 만들어야, 같은 파일명이 다른 프로젝트에
        # 있거나 같은 문서를 재업로드했을 때 청크 id가 충돌하지 않는다.
        chunk_id = f"{doc_id}:c{i}"
        chunks.append(
            Chunk(
                id=chunk_id,
                text=piece,
                metadata={
                    "source": source,
                    "page": page_at(offset),
                    "chunk_index": i,
                    "doc_id": doc_id,
                    "project_id": project_id,
                },
            )
        )
    return chunks
