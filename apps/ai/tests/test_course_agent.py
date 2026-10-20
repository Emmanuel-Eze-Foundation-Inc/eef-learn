import json

import pytest

from eef_ai.agent.course import CourseState, _dispatch
from eef_ai.settings import Settings


@pytest.mark.asyncio
async def test_agent_builds_modules_in_state():
    settings = Settings.model_construct(
        database_url="postgresql://eef:eef@localhost:5432/eef_learn",
        ai_service_token="t",
    )
    state = CourseState()
    out = await _dispatch(
        "add_module",
        {"slug": "react-loop", "title": "The ReAct loop", "order": 0},
        state,
        settings,
    )
    assert json.loads(out)["ok"] is True
    assert state.nodes[0]["title"] == "The ReAct loop"
    await _dispatch(
        "add_prerequisite",
        {"from_slug": "react-loop", "to_slug": "tools"},
        state,
        settings,
    )
    assert len(state.edges) == 1
    await _dispatch("finish_map", {"summary": "ready"}, state, settings)
    assert state.finished
