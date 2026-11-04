import assert from "node:assert/strict";
import test from "node:test";
import { chosenSpeechVoice, voicesForLanguage } from "./speech-voices";

const voices = [
  { voiceURI: "remote-us", name: "Remote Spanish", lang: "es-US", localService: false },
  { voiceURI: "local-mx", name: "Natural MX", lang: "es-MX", localService: true },
  { voiceURI: "local-en", name: "English", lang: "en-US", localService: true },
];

test("Spanish output never selects an English voice and prefers a local natural voice", () => {
  assert.deepEqual(voicesForLanguage(voices, "es-PE").map((voice) => voice.voiceURI), ["local-mx", "remote-us"]);
  assert.equal(chosenSpeechVoice(voices, "es-PE", "local-en")?.voiceURI, "local-mx");
});

test("an explicit supported voice choice wins over the default", () => {
  assert.equal(chosenSpeechVoice(voices, "es-PE", "remote-us")?.voiceURI, "remote-us");
  assert.equal(chosenSpeechVoice([], "en-US", "") , null);
});

test("Google UK English Female is preferred for English replies when available", () => {
  const englishVoices = [
    { voiceURI: "device-en", name: "Microsoft English", lang: "en-US", localService: true },
    { voiceURI: "google-female", name: "Google UK English Female", lang: "en-GB", localService: false },
  ];
  assert.equal(chosenSpeechVoice(englishVoices, "en-US", "")?.voiceURI, "google-female");
});

test("a legacy Zira voice does not override the preferred engine; explicit choices still win", () => {
  const englishVoices = [
    { voiceURI: "device-en", name: "Microsoft English", lang: "en-US", localService: true },
    { voiceURI: "google-female", name: "Google UK English Female", lang: "en-GB", localService: false },
    { voiceURI: "zira", name: "Microsoft Zira Desktop", lang: "en-US", localService: true },
  ];
  assert.equal(chosenSpeechVoice(englishVoices, "en-US", "")?.voiceURI, "google-female");
  assert.equal(chosenSpeechVoice(englishVoices, "en-US", "zira")?.voiceURI, "zira");
});

test("advertised natural voices outrank legacy desktop and generic Google voices in both languages", () => {
  for (const [language, locale] of [["en-US", "en-US"], ["es-PE", "es-MX"]] as const) {
    const candidates = [
      { voiceURI: "desktop", name: "Microsoft Zira Desktop", lang: locale, localService: true },
      { voiceURI: "google", name: "Google", lang: locale, localService: false },
      { voiceURI: "natural", name: "Microsoft Natural", lang: locale, localService: false },
    ];
    assert.equal(chosenSpeechVoice(candidates, language, "")?.voiceURI, "natural");
    assert.equal(chosenSpeechVoice(candidates, language, "removed-voice")?.voiceURI, "natural");
  }
});

test("voice quality never overrides the requested language", () => {
  const candidates = [
    { voiceURI: "en-neural", name: "Neural Premium", lang: "en-US", localService: false },
    { voiceURI: "es-basic", name: "Desktop", lang: "es-PE", localService: true },
  ];
  assert.equal(chosenSpeechVoice(candidates, "es-PE", "en-neural")?.voiceURI, "es-basic");
});
