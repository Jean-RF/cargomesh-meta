import { execFile, execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { z } from 'zod';
import { inspectMetaEnvironment, META_REPOSITORY, type MetaEnvironment, type MetaTarget } from '../src/server/ai/meta/environment-readiness';
import { MetaSpeechSessionIdSchema } from '../src/shared/schemas/meta/provider-identifiers';

const appRoot = fileURLToPath(new URL('../', import.meta.url));
const axelFiles = ['scripts/meta-text-smoke.ts', 'src/server/ai/meta/client.ts', 'src/server/ai/meta/config.ts', 'src/shared/schemas/meta/model-proposal.ts'];
type Probe = { exitCode: number; stdout: string };
type Ports = { hasFile: (path: string) => boolean; textProbe: () => Promise<Probe>; voiceProbe?: (path: string) => Promise<Probe> };
const VoiceAcceptance = z.object({
  check: z.literal('meta-voice'), status: z.literal('PASS_VOICE_TRANSPORT'), liveRequestMade: z.literal(true),
  scope: z.literal('OPERATOR_LOCAL_FILE_NOT_TENANT_INTEGRATION'), accuracyVerified: z.literal(false),
  persistedWrites: z.literal(0), commercialWrites: z.literal(0), error: z.null(),
  metadata: z.object({
    provider: z.literal('META'), transport: z.literal('META_MODEL_API'),
    model: z.string().regex(/^muse-voice-transcribe-[a-zA-Z0-9.-]{1,70}$/),
    attempts: z.literal(1), latencyMs: z.number().finite().nonnegative(), processingMayHaveOccurred: z.literal(true),
    requestId: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/).nullable(),
    providerSessionId: MetaSpeechSessionIdSchema,
    audioProcessedMs: z.number().int().min(0).max(600_000), estimatedCostUsd: z.null(),
  }).strict(),
  transcription: z.object({ evidenceId: z.string().uuid(), inputRevision: z.literal(0), status: z.literal('TRANSCRIBED'),
    transcriptCharacters: z.number().int().min(1).max(6000), audioDurationMs: z.number().int().min(1).max(600_000),
    requiresHumanConfirmation: z.literal(true) }).strict(),
}).strict();
const Metadata = z.object({
  provider: z.literal('META'), transport: z.literal('META_MODEL_API'),
  model: z.string().regex(/^muse-spark-[a-zA-Z0-9.-]+$/).max(100),
  requestId: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/).nullable(),
  latencyMs: z.number().finite().nonnegative(), attempts: z.number().int().min(1).max(2),
  inputTokens: z.number().int().nonnegative().nullable(), outputTokens: z.number().int().nonnegative().nullable(),
  estimatedCostUsd: z.null(), outcome: z.literal('PROPOSED'),
}).strict();
const TextAcceptance = z.object({
  check: z.literal('meta-text'), status: z.literal('PASS'), liveRequestMade: z.literal(true),
  mode: z.literal('META'), metadata: Metadata, error: z.null(),
  expectedOwnSyntheticValuesMatched: z.literal(true), commercialWrites: z.literal(0),
}).strict();

/** This script delegates to Axel's accepted adapter; it contains no second SDK client. */
export async function runMetaSmoke(args: string[], env: MetaEnvironment, target: MetaTarget, ports: Ports) {
  const readiness = inspectMetaEnvironment(env, target);
  const missingDependencies = axelFiles.filter(file => !ports.hasFile(file));
  const missingVoiceDependencies = ['scripts/meta-voice-smoke.ts', 'src/server/ai/meta/transcribe.ts', 'src/server/ai/meta/wave.ts']
    .filter(file => !ports.hasFile(file));
  const missingImageDependencies = ['scripts/meta-media-smoke.ts', 'src/server/ai/meta/interpret-media-declaration.ts', 'src/server/ai/meta/media-input.ts']
    .filter(file => !ports.hasFile(file));
  const base = { check: 'meta-environment', readiness, missingDependencies, missingVoiceDependencies,
    missingImageDependencies, voiceCheck: missingVoiceDependencies.length ? 'PENDING_AX_10' : 'NOT_RUN',
    imageCheck: missingImageDependencies.length ? 'PENDING_AX_02' : 'NOT_RUN' };
  const liveVoice = args.length === 2 && args[0] === '--live-voice' && Boolean(args[1]?.trim()) && !args[1].startsWith('--') && args[1].length <= 2048;
  if ((!liveVoice && args.length > 1) || (args.length === 1 && !['--check', '--provider-only', '--live-text'].includes(args[0])))
    return { exitCode: 2, report: { ...base, status: 'INVALID_ARGUMENTS', liveRequestMade: false } };
  // Isolated AI needs no database. Preserve full application readiness in the nested report.
  if (args[0] === '--provider-only') {
    const configured = readiness.providerReady && readiness.voiceReady;
    const pending = missingDependencies.length || missingVoiceDependencies.length || missingImageDependencies.length;
    const status = readiness.status === 'UNSAFE_CONFIGURATION' ? 'UNSAFE_CONFIGURATION' :
      !configured ? 'NOT_CONFIGURED' : pending ? 'DEPENDENCY_PENDING' : 'READY_FOR_LIVE_CHECK';
    return { exitCode: status === 'READY_FOR_LIVE_CHECK' ? 0 : 2,
      report: { ...base, scope: 'AI_ONLY', status, liveRequestMade: false } };
  }
  if (!liveVoice && args[0] !== '--live-text') {
    const pending = missingDependencies.length || missingVoiceDependencies.length;
    const status = readiness.applicationReady && pending ? 'DEPENDENCY_PENDING' : readiness.status;
    return { exitCode: readiness.applicationReady && !pending ? 0 : 2, report: { ...base, status, liveRequestMade: false } };
  }
  if (!(liveVoice ? readiness.voiceReady : readiness.providerReady) || readiness.status === 'UNSAFE_CONFIGURATION')
    return { exitCode: 2, report: { ...base, status: readiness.status, liveRequestMade: false } };
  if (missingDependencies.length || (liveVoice && (missingVoiceDependencies.length || !ports.voiceProbe)))
    return { exitCode: 2, report: { ...base, status: 'DEPENDENCY_PENDING', liveRequestMade: false } };
  try {
    const response = liveVoice ? await ports.voiceProbe!(args[1]) : await ports.textProbe();
    if (liveVoice) {
      const accepted = VoiceAcceptance.safeParse(JSON.parse(response.stdout));
      const secrets = Object.entries(env).filter(([name, value]) => /(?:KEY|SECRET|TOKEN|PASSWORD)$/i.test(name) && value && value.length >= 4).map(([, value]) => value!);
      if (response.exitCode !== 0 || !accepted.success || accepted.data.metadata.model !== env.META_TRANSCRIBE_MODEL ||
        secrets.some(value => JSON.stringify(accepted.data).includes(value)))
        return { exitCode: 1, report: { ...base, status: 'FAILED_LIVE_CHECK', liveRequestMade: null } };
      return { exitCode: 0, report: { ...base, status: 'PASS_VOICE_TRANSPORT', voiceCheck: 'PASS_VOICE_TRANSPORT', liveRequestMade: true,
        metadata: accepted.data.metadata, transcription: accepted.data.transcription, scope: accepted.data.scope, accuracyVerified: false } };
    }
    const accepted = TextAcceptance.safeParse(JSON.parse(response.stdout));
    if (response.exitCode !== 0 || !accepted.success || accepted.data.metadata.model !== env.META_MUSE_MODEL)
      return { exitCode: 1, report: { ...base, status: 'FAILED_LIVE_CHECK', liveRequestMade: null } };
    const privateValues = Object.entries(env).filter(([name, value]) => /(?:KEY|SECRET|TOKEN|PASSWORD)$/i.test(name) && value && value.length >= 4).map(([, value]) => value!);
    if ([accepted.data.metadata.model, accepted.data.metadata.requestId ?? ''].some(value => privateValues.some(secret => value.includes(secret))))
      return { exitCode: 1, report: { ...base, status: 'FAILED_LIVE_CHECK', liveRequestMade: null } };
    return { exitCode: 0, report: { ...base, status: 'PASS_TEXT_ONLY', liveRequestMade: true, metadata: accepted.data.metadata } };
  } catch {
    // A killed/timed-out process may have reached Meta. Never print its output/error.
    return { exitCode: 1, report: { ...base, status: 'FAILED_LIVE_CHECK', liveRequestMade: null } };
  }
}

function localTarget(): MetaTarget {
  let repository = 'unrecognized', branch = 'unrecognized';
  try {
    const origin = execFileSync('git', ['remote', 'get-url', 'origin'], { cwd: appRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (origin === `https://github.com/${META_REPOSITORY}.git` || origin === `https://github.com/${META_REPOSITORY}` || origin === `git@github.com:${META_REPOSITORY}.git`)
      repository = META_REPOSITORY;
    branch = execFileSync('git', ['branch', '--show-current'], { cwd: appRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch { /* A non-Meta checkout must fail before a provider call. */ }
  return { repository, branch, rootDirectory: relative(resolve(appRoot, '..'), appRoot), stage: 'local' };
}

const ports: Ports = {
  hasFile: file => existsSync(resolve(appRoot, file)),
  textProbe: () => new Promise(resolveProbe => {
    execFile(process.execPath, ['--conditions=react-server', '--import', 'tsx', 'scripts/meta-text-smoke.ts', '--live'],
      { cwd: appRoot, timeout: 55_000, maxBuffer: 65_536, windowsHide: true },
      (error, stdout) => resolveProbe({ exitCode: error ? 1 : 0, stdout }));
  }),
  voiceProbe: path => new Promise(resolveProbe => {
    execFile(process.execPath, ['--conditions=react-server', '--import', 'tsx', 'scripts/meta-voice-smoke.ts', '--live', path],
      { cwd: appRoot, timeout: 55_000, maxBuffer: 65_536, windowsHide: true },
      (error, stdout) => resolveProbe({ exitCode: error ? 1 : 0, stdout }));
  }),
};

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  runMetaSmoke(process.argv.slice(2), process.env, localTarget(), ports).then(({ report, exitCode }) => {
    console.log(JSON.stringify(report, null, 2)); process.exitCode = exitCode;
  }).catch(() => { console.log(JSON.stringify({ check: 'meta-environment', status: 'FAILED', privateDetailsOmitted: true })); process.exitCode = 1; });
}
