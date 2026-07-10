"""RawPage 리스트 -> 임베딩 모델 토크나이저 기준으로 길이를 맞춘 청크 리스트."""

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


def chunk_pages(pages: list[RawPage]) -> list[Chunk]:
    chunks: list[Chunk] = []
    for page in pages:
        pieces = _splitter.split_text(page.text)
        for i, piece in enumerate(pieces):
            source = page.metadata.get("source", "unknown")
            page_no = page.metadata.get("page")
            chunk_id = f"{source}:p{page_no}:c{i}"
            chunks.append(
                Chunk(
                    id=chunk_id,
                    text=piece,
                    metadata={**page.metadata, "chunk_index": i},
                )
            )
    return chunks
