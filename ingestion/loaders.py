"""문서 파일(PDF/DOCX) -> 원문 텍스트 + 메타데이터 추출."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

import fitz  # PyMuPDF
from docx import Document as DocxDocument


@dataclass
class RawPage:
    text: str
    metadata: dict = field(default_factory=dict)


def load_pdf(path: str | Path) -> list[RawPage]:
    path = Path(path)
    pages = []
    with fitz.open(path) as doc:
        for page_no, page in enumerate(doc, start=1):
            text = page.get_text().strip()
            if not text:
                continue
            pages.append(
                RawPage(
                    text=text,
                    metadata={"source": path.name, "page": page_no},
                )
            )
    return pages


def load_docx(path: str | Path) -> list[RawPage]:
    path = Path(path)
    doc = DocxDocument(path)
    text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
    if not text:
        return []
    return [RawPage(text=text, metadata={"source": path.name, "page": None})]


def load_document(path: str | Path) -> list[RawPage]:
    path = Path(path)
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        return load_pdf(path)
    if suffix == ".docx":
        return load_docx(path)
    raise ValueError(f"지원하지 않는 파일 형식: {suffix}")
