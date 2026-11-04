# Browser voice playback — 4 November 2026

Axel requested a less robotic spoken response after Meta inference was enabled in the hosted deployment. Source reviewed: `Jean-RF/cargomesh-meta`, main `78aad266d278c01116fe95e926d08c996fa108cf`. Local correction: `codex/meta-axel`, Axel assisted by Codex.

## Diagnosis and change

The normal chat reads generated text using the browser's Web Speech `speechSynthesis`, via `useConversationVoice`. Meta text inference and browser audio playback are separate. The previous automatic ranking explicitly preferred Microsoft Zira Desktop over Google voices and gave advertised natural/neural voices only a small bonus.

Automatic selection now prioritizes voices labelled Natural, Neural, Enhanced or Premium, then Google voices, within the requested language. Names are a heuristic, not a guarantee of acoustic quality or availability. An explicit saved voice remains authoritative; a missing or wrong-language preference falls back to automatic selection. Legacy voices remain available when no better engine exists. Playback uses the chosen voice's actual locale and its native rate (1), without artificial pitch changes.

## Meta API boundary

The [Meta models guide](https://dev.meta.ai/docs/models) and [speech guide](https://dev.meta.ai/docs/speech-to-text), checked 4 November 2026, describe Muse Voice Transcribe as speech-to-text only. They explicitly exclude speech synthesis and speech-to-speech. There is no documented default Meta TTS voice to substitute in this integration. A voice in the consumer Meta AI app does not imply an API endpoint.

This change adds no provider, credential, SDK, infrastructure or cloud deployment. It does not reconnect the historical AWS gateway. Uniform neural audio across devices would need a separately chosen TTS service; browser voices vary by operating system/browser and cannot guarantee AWS-like audio quality.

## Verification and limits

- 11 focused voice-selection, language, preference and speech-turn/status tests pass.
- TypeScript checked separately; see execution result accompanying this change.
- No acoustic listening acceptance or production deployment performed. Verify English and Spanish on the actual demo computer after integration. Re-test an installed Natural/Neural voice, automatic fallback, stop playback and a complete response.
- No `.env.local` or API keys added to Git.
