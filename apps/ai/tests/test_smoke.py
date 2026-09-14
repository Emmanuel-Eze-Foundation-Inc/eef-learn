import os

os.environ.setdefault("DATABASE_URL", "postgresql://eef:eef@localhost:5432/eef_learn")
os.environ.setdefault("AI_SERVICE_TOKEN", "test-token")

from fastapi.testclient import TestClient

from eef_ai.main import app
from eef_ai.providers import mock

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    assert body["provider"] == "mock"


def test_mock_skeleton_requires_token():
    r = client.post("/dev/mock-skeleton", json={"topic": "Linear Algebra"})
    assert r.status_code == 401


def test_mock_skeleton_deterministic():
    headers = {"Authorization": "Bearer test-token"}
    a = client.post("/dev/mock-skeleton", json={"topic": "Linear Algebra"}, headers=headers)
    b = client.post("/dev/mock-skeleton", json={"topic": "Linear Algebra"}, headers=headers)
    assert a.status_code == 200
    assert a.json() == b.json()
    assert len(a.json()["nodes"]) == 4


def test_mock_embeddings_shape():
    vecs = mock.embed(["hello", "world"], dimensions=8)
    assert len(vecs) == 2
    assert all(len(v) == 8 for v in vecs)
    assert mock.embed(["hello"], dimensions=8)[0] == vecs[0]
