"""문서 바이트(PDF/DOCX) -> 원문 텍스트 + 메타데이터 추출.

디스크에 파일을 저장하지 않고, 메모리 상의 바이트를 바로 파싱한다 (업로드된
파일이 data/ 폴더에 영구적으로 쌓이는 걸 막기 위함 — ChromaDB에 이미 검색에
필요한 내용이 다 들어가므로 원본 파일을 남겨둘 필요가 없다).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from io import BytesIO
from pathlib import Path

import fitz  # PyMuPDF
from docx import Document as DocxDocument


@dataclass
class RawPage:
    text: str
    metadata: dict = field(default_factory=dict)


def load_pdf(data: bytes, filename: str) -> list[RawPage]:
    pages = []
    with fitz.open(stream=data, filetype="pdf") as doc:
        for page_no, page in enumerate(doc, start=1):
            text = page.get_text().strip()
            if not text:
                continue
            pages.append(
                RawPage(
                    text=text,
                    metadata={"source": filename, "page": page_no},
                )
            )
    return pages


def load_docx(data: bytes, filename: str) -> list[RawPage]:
    doc = DocxDocument(BytesIO(data))
    text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
    if not text:
        return []
    return [RawPage(text=text, metadata={"source": filename, "page": None})]


def load_document(data: bytes, filename: str) -> list[RawPage]:
    suffix = Path(filename).suffix.lower()
    if suffix == ".pdf":
        return load_pdf(data, filename)
    if suffix == ".docx":
        return load_docx(data, filename)
    raise ValueError(f"지원하지 않는 파일 형식: {suffix}")
