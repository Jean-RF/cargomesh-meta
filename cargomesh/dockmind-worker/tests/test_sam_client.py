from types import SimpleNamespace

from dockmind.sam_client import MetaSamClient


def test_sdk_cannot_silently_repeat_a_billable_analysis(monkeypatch):
    captured = {}

    def client(**kwargs):
        captured.update(kwargs)
        return SimpleNamespace()

    monkeypatch.setattr("openai.OpenAI", client)
    MetaSamClient(api_key="synthetic-test-key")
    assert captured["max_retries"] == 0
    assert captured["base_url"] == "https://api.meta.ai/v1"
