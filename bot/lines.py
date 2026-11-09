from collections import defaultdict
from typing import List


class LineManager:
    """Simple in-memory storage for user lines."""

    def __init__(self) -> None:
        self._lines: defaultdict[int, List[str]] = defaultdict(list)

    def add_line(self, user_id: int, text: str) -> None:
        self._lines[user_id].append(text)

    def list_lines(self, user_id: int) -> List[str]:
        return list(self._lines.get(user_id, []))
