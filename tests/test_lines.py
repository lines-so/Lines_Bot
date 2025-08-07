import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))
from bot.lines import LineManager


def test_line_manager():
    manager = LineManager()
    manager.add_line(1, "test")
    assert manager.list_lines(1) == ["test"]
    assert manager.list_lines(2) == []
