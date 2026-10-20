from eef_ai.providers.mock import generate_module_beats
from eef_ai.sources import canonical_youtube, youtube_id


def test_youtube_id_from_watch_url():
    assert youtube_id("https://www.youtube.com/watch?v=eMlx5fFNoYc") == "eMlx5fFNoYc"
    assert canonical_youtube("https://youtu.be/eMlx5fFNoYc") == "https://www.youtube.com/watch?v=eMlx5fFNoYc"


def test_mock_module_mixes_watch_idea_check():
    beats = generate_module_beats("loop", "The agent loop")
    types = [b["type"] for b in beats]
    assert types == ["youtube", "ai_text", "quiz"]
