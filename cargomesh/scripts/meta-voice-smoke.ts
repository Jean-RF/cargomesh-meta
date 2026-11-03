import { randomUUID, createHash } from 'node:crypto';
import { open } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { metaSpeechProvider, transcribeEvidence, type SpeechProvider } from '../src/server/ai/meta/transcribe';
import { readMetaSpeechConfig, type MetaEnvironment } from '../src/server/ai/meta/config';
import { inspectWave, MAX_WAVE_BYTES } from '../src/server/ai/meta/wave';

/** Local operator-selected file only. The in-memory access projection does NOT certify tenant/RLS integration. */
export async function runVoiceSmoke(audio: Uint8Array, env: MetaEnvironment, provider: SpeechProvider = metaSpeechProvider({ env })) {
  const evidenceId = randomUUID(), organizationId = randomUUID(), hash = createHash('sha256').update(audio).digest('hex');
  const result = await transcribeEvidence({ schemaVersion: '1.0', evidenceId, inputRevision: 0, language: 'es' },
    { userId: randomUUID(), memberId: randomUUID(), organizationId, userEmail: '', role: 'REQUESTER', status: 'ACTIVE' }, {
      provider, evidence: {
        readAuthorized: async () => ({ evidenceId, inputRevision: 0, organizationId, state: 'ACTIVE', contentSha256: hash, bytes: audio }),
        checkCurrent: async () => 'CURRENT',
      },
    });
  const base = { check: 'meta-voice', scope: 'OPERATOR_LOCAL_FILE_NOT_TENANT_INTEGRATION', accuracyVerified: false,
    persistedWrites: 0, commercialWrites: 0, metadata: result.metadata,
    liveRequestMade: result.metadata.transport === 'META_MODEL_API' && result.metadata.attempts > 0 };
  if (!result.ok) return { ...base, status: 'FAILED_VOICE_CHECK', error: result.error, transcription: null };
  // Do not print the transcript, original filename, audio, environment or raw provider reply.
  const transcription = { evidenceId, inputRevision: 0, status: result.transcription.status,
    transcriptCharacters: result.transcription.text.length, audioDurationMs: result.transcription.audioDurationMs, requiresHumanConfirmation: true };
  return { ...base, status: result.transcription.status === 'EMPTY' ? 'EMPTY_TRANSCRIPT' :
    result.metadata.transport === 'INJECTED' ? 'PASS_SIMULATED' : 'PASS_VOICE_TRANSPORT', error: null, transcription };
}

/** Bounded read: a file changing/growing after stat cannot cause an unbounded readFile allocation. */
export async function readOwnWave(path: string) {
  const handle = await open(path, 'r');
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size < 44 || stat.size > MAX_WAVE_BYTES) return null;
    const bytes = new Uint8Array(stat.size); let offset = 0;
    while (offset < bytes.length) {
      const part = await handle.read(bytes, offset, bytes.length - offset, offset);
      if (!part.bytesRead) return null;
      offset += part.bytesRead;
    }
    if ((await handle.read(new Uint8Array(1), 0, 1, bytes.length)).bytesRead || !inspectWave(bytes)) return null;
    return bytes;
  } finally { await handle.close(); }
}

async function main() {
  if (process.argv.length !== 4 || process.argv[2] !== '--live' || process.argv[3].startsWith('--'))
    return { check: 'meta-voice', status: 'LIVE_OPT_IN_REQUIRED', liveRequestMade: false };
  if (!readMetaSpeechConfig()) return { check: 'meta-voice', status: 'NOT_CONFIGURED', liveRequestMade: false };
  let audio: Uint8Array | null;
  try { audio = await readOwnWave(process.argv[3]); } catch { audio = null; }
  if (!audio) return { check: 'meta-voice', status: 'MEDIA_INVALID', liveRequestMade: false };
  return runVoiceSmoke(audio, process.env);
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().then(report => {
    const secrets = Object.entries(process.env).filter(([name, value]) => /(?:KEY|TOKEN|SECRET|PASSWORD)$/i.test(name) && value && value.length >= 4).map(([, value]) => value!);
    const safe = !secrets.some(value => JSON.stringify(report).includes(value));
    console.log(JSON.stringify(safe ? report : { check: 'meta-voice', status: 'FAILED_VOICE_CHECK', liveRequestMade: null }));
    process.exitCode = safe && report.status === 'PASS_VOICE_TRANSPORT' ? 0 : 2;
  }).catch(() => { console.log(JSON.stringify({ check: 'meta-voice', status: 'FAILED_VOICE_CHECK', liveRequestMade: null })); process.exitCode = 1; });
}
