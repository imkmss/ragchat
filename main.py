"""RAG 검색 CLI 진입점.

사용법:
  python main.py index <파일 또는 폴더 경로>   # 문서 인덱싱
  python main.py search <질문>                 # 검색 (top-k 청크 출력)
"""

import sys

from pipeline.index_pipeline import index_directory, index_file
from retrieval.retriever import retrieve


def cmd_index(path: str) -> None:
    from pathlib import Path

    p = Path(path)
    if p.is_dir():
        index_directory(p)
    else:
        count = index_file(p)
        print(f"[indexed] {p.name}: {count} chunks")


def cmd_search(question: str) -> None:
    hits = retrieve(question)
    for i, hit in enumerate(hits, start=1):
        print(f"\n[{i}] (거리: {hit['distance']:.4f}, 출처: {hit['metadata']})")
        print(hit["text"])


def main() -> None:
    if len(sys.argv) < 2:
        print(__doc__)
        return

    command = sys.argv[1]
    if command == "index" and len(sys.argv) >= 3:
        cmd_index(sys.argv[2])
    elif command == "search" and len(sys.argv) >= 3:
        cmd_search(" ".join(sys.argv[2:]))
    else:
        print(__doc__)


if __name__ == "__main__":
    main()
