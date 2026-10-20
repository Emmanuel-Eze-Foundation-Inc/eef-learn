"""Sealed user-model keys in GenerationJob payloads (apps/web sealForJob <-> unseal_key)."""

import shutil
import subprocess

import pytest

from eef_ai.providers.chat import job_user_model, unseal_key

TOKEN = "service-token-for-tests"

# Mirrors apps/web/lib/user-ai-key.ts sealForJob byte for byte.
SEAL_JS = """
const { createCipheriv, hkdfSync, randomBytes } = require("node:crypto");
const [token, plain] = process.argv.slice(1);
const key = Buffer.from(hkdfSync("sha256", token, "eef-job-key", "user-model v1", 32));
const iv = randomBytes(12);
const c = createCipheriv("aes-256-gcm", key, iv);
const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
process.stdout.write("j1:" + Buffer.concat([iv, enc, c.getAuthTag()]).toString("base64url"));
"""


class _Settings:
    def __init__(self, token: str, token_next: str | None = None):
        self.ai_service_token = token
        self.ai_service_token_next = token_next


def _seal(token: str, plain: str) -> str:
    if not shutil.which("node"):
        pytest.skip("node not installed")
    out = subprocess.run(["node", "-e", SEAL_JS, token, plain], capture_output=True, text=True, check=True)
    return out.stdout


def test_unseals_a_key_sealed_by_the_web_app():
    sealed = _seal(TOKEN, "sk-or-v1-secret")
    assert unseal_key(sealed, [TOKEN]) == "sk-or-v1-secret"
    user = job_user_model({"provider": "openrouter", "model": None, "sealedKey": sealed}, _Settings(TOKEN))
    assert user is not None and user.key == "sk-or-v1-secret" and user.provider == "openrouter"


def test_rotation_accepts_the_next_token():
    sealed = _seal("new-token", "sk-ant-x")
    user = job_user_model({"provider": "anthropic", "sealedKey": sealed}, _Settings(TOKEN, "new-token"))
    assert user is not None and user.key == "sk-ant-x"


def test_wrong_token_or_tampering_yields_no_model():
    sealed = _seal(TOKEN, "sk-x")
    assert unseal_key(sealed, ["other-token"]) is None
    tampered = sealed[:-2] + ("A" if sealed[-2] != "A" else "B") + sealed[-1]
    assert unseal_key(tampered, [TOKEN]) is None
    assert unseal_key("not-sealed", [TOKEN]) is None


def test_plaintext_key_in_a_job_payload_is_ignored():
    assert job_user_model({"provider": "openai", "key": "sk-plain"}, _Settings(TOKEN)) is None
