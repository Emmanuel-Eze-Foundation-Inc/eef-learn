import asyncio
import json

from eef_ai.agent.editor import EditState, _dispatch, course_snapshot, run_mock_editor
from eef_ai.settings import Settings

COURSE = {
    "title": "AI engineering",
    "topic": "AI engineering",
    "nodes": [
        {
            "slug": "intro",
            "title": "Introduction",
            "depth": 0,
            "blocks": [{"id": "blk_1", "type": "ai_text", "title": "Intro", "preview": "AI engineering is"}],
        },
        {"slug": "math", "title": "Mathematics", "depth": 1, "blocks": []},
    ],
    "prerequisites": [{"from": "intro", "to": "math"}],
}


def test_mock_builds_outline_for_empty_course():
    result = run_mock_editor(course={"title": "Rust", "topic": "Rust", "nodes": []}, message="Build a course on Rust", focus=None)
    lessons = [op for op in result["ops"] if op["op"] == "add_lesson"]
    modules = [op for op in lessons if op["parent"] is None]
    assert len(modules) == 3
    assert len(lessons) == 9
    assert any(op["op"] == "add_prerequisite" for op in result["ops"])
    assert len({op["slug"] for op in lessons}) == len(lessons)


def test_mock_adds_quiz_to_focus_lesson():
    result = run_mock_editor(course=COURSE, message="add a quiz", focus="math")
    assert result["ops"] == [
        {"op": "add_block", "lesson": "math", "type": "quiz", "title": "Check yourself", "body": result["ops"][0]["body"]}
    ]
    assert json.loads(result["ops"][0]["body"])["correct"] == ["a"]


def test_mock_rewrites_existing_reading():
    result = run_mock_editor(course=COURSE, message="rewrite this simpler", focus="intro")
    assert result["ops"][0]["op"] == "update_block"
    assert result["ops"][0]["id"] == "blk_1"


def test_dispatch_rejects_unknown_slug_and_bad_quiz():
    state = EditState(slugs={"intro"}, block_ids=set())
    settings = Settings()
    bad_slug = asyncio.run(
        _dispatch("add_block", {"lesson_slug": "nope", "type": "ai_text", "body": "x" * 60}, state, settings, verify=False)
    )
    bad_quiz = asyncio.run(
        _dispatch("add_block", {"lesson_slug": "intro", "type": "quiz", "body": "{}"}, state, settings, verify=False)
    )
    assert json.loads(bad_slug)["ok"] is False
    assert json.loads(bad_quiz)["ok"] is False
    assert state.ops == []


def test_dispatch_add_lesson_dedupes_slug():
    state = EditState(slugs={"intro"}, block_ids=set())
    out = json.loads(asyncio.run(_dispatch("add_lesson", {"slug": "intro", "title": "Intro"}, state, Settings(), verify=False)))
    assert out["slug"] == "intro-2"
    assert state.ops[0]["parent"] is None


def test_snapshot_marks_focus():
    snap = course_snapshot(COURSE, "math")
    assert "[math] Mathematics  <- FOCUS" in snap
    assert "intro->math" in snap
