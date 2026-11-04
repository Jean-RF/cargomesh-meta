import 'server-only';
import { readMetaSpeechConfig } from './config';

export const META_REPOSITORY = 'Chujutak2024/meta-hackathon';
export const META_API_ORIGIN = 'https://api.meta.ai/v1';
export type MetaEnvironment = Readonly<Record<string, string | undefined>>;
export type MetaTarget = { repository: string; branch: string; rootDirectory: string; stage: 'local' | 'preview' | 'production' };
type Check = { name: string; scope: 'provider' | 'application'; status: 'PASS' | 'MISSING' | 'INVALID' };

const present = (value: string | undefined) => Boolean(value?.trim());
const validModel = (value: string | undefined, prefix: string) => Boolean(value &&
  new RegExp('^' + prefix + '[a-zA-Z0-9.-]{1,70}$').test(value) && !value.toLowerCase().includes('contributor'));
function privilegedSupabaseKey(value: string | undefined) {
  if (!value) return false;
  if (value.startsWith('sb_secret_')) return true;
  try {
    if (value.length > 8_192 || value.split('.').length !== 3) return false;
    return JSON.parse(Buffer.from(value.split('.')[1], 'base64url').toString('utf8')).role === 'service_role';
  } catch { return false; }
}
function supabaseOrigin(value: string | undefined) {
  try {
    const url = new URL(value ?? '');
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/') return null;
    const hosted = url.protocol === 'https:' && url.hostname.endsWith('.supabase.co') && !url.port;
    const local = url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) && Boolean(url.port);
    return hosted || local ? url.origin : null;
  } catch { return null; }
}

/** Read-only metadata. It never returns credentials, invokes a provider or proves access. */
export function inspectMetaEnvironment(env: MetaEnvironment, target: MetaTarget) {
  const checks: Check[] = [];
  const check = (name: string, scope: Check['scope'], available: boolean, valid = true) =>
    checks.push({ name, scope, status: !available ? 'MISSING' : valid ? 'PASS' : 'INVALID' });
  check('repository', 'provider', true, target.repository === META_REPOSITORY);
  check('source-branch', 'provider', true, target.stage === 'production' ? target.branch === 'main' :
    target.branch === 'main' || /^codex\/meta-[a-z0-9-]+$/.test(target.branch));
  check('root-directory', 'provider', true, target.rootDirectory === 'cargomesh');
  check('provider-selection', 'provider', present(env.CARGOMESH_AI_PROVIDER), env.CARGOMESH_AI_PROVIDER === 'META');
  check('META_MODEL_API_KEY', 'provider', present(env.META_MODEL_API_KEY));
  check('META_MODEL_BASE_URL', 'provider', true, (env.META_MODEL_BASE_URL ?? META_API_ORIGIN).replace(/\/$/, '') === META_API_ORIGIN);
  check('META_MUSE_MODEL', 'provider', present(env.META_MUSE_MODEL), validModel(env.META_MUSE_MODEL, 'muse-spark-'));
  check('META_CONVERSATION_REASONING_EFFORT', 'provider', true,
    ['minimal', 'low'].includes(env.META_CONVERSATION_REASONING_EFFORT ?? 'minimal'));
  const timeout = Number(env.META_PROPOSAL_TIMEOUT_MS ?? 45_000), tokens = Number(env.META_PROPOSAL_MAX_OUTPUT_TOKENS ?? 2_048);
  check('META_PROPOSAL_TIMEOUT_MS', 'provider', true, Number.isInteger(timeout) && timeout >= 1_000 && timeout <= 45_000);
  check('META_PROPOSAL_MAX_OUTPUT_TOKENS', 'provider', true, Number.isInteger(tokens) && tokens >= 256 && tokens <= 4_096);
  check('META_TRANSCRIBE_MODEL', 'application', present(env.META_TRANSCRIBE_MODEL), validModel(env.META_TRANSCRIBE_MODEL, 'muse-voice-transcribe-'));
  const publicKeys = new Set(['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_GOOGLE_MAPS_JS_API_KEY']);
  const privateValues = Object.entries(env).filter(([name, value]) => !name.startsWith('NEXT_PUBLIC_') &&
    /(?:MODEL_API_KEY|SERVICE_ROLE_KEY|SECRET|TOKEN|PASSWORD)$/i.test(name) && value && value.trim().length >= 8).map(([, value]) => value!.trim());
  const exposedSecret = Object.entries(env).some(([name, value]) => present(value) && name.startsWith('NEXT_PUBLIC_') &&
    ((!publicKeys.has(name) && /(?:KEY|SECRET|TOKEN|PASSWORD)/i.test(name)) ||
      privateValues.includes(value!.trim()) || privilegedSupabaseKey(value?.trim())));
  check('no-public-secrets', 'provider', true, !exposedSecret);
  check('legacy-voice-disabled', 'provider', true, env.NEXT_PUBLIC_CARGOMESH_NOVA_VOICE_PREVIEW !== 'true' && env.CARGOMESH_NOVA_DEMO_VOICE !== 'true');
  const approved = supabaseOrigin(env.META_APPROVED_SUPABASE_URL), configured = supabaseOrigin(env.NEXT_PUBLIC_SUPABASE_URL);
  check('META_APPROVED_SUPABASE_URL', 'application', present(env.META_APPROVED_SUPABASE_URL), Boolean(approved));
  check('NEXT_PUBLIC_SUPABASE_URL', 'application', present(env.NEXT_PUBLIC_SUPABASE_URL), Boolean(configured) &&
    (!approved || configured === approved) && (target.stage === 'local' || configured?.startsWith('https:') === true));
  check('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'application', present(env.NEXT_PUBLIC_SUPABASE_ANON_KEY));
  check('SUPABASE_SERVICE_ROLE_KEY', 'application', present(env.SUPABASE_SERVICE_ROLE_KEY));
  const providerReady = checks.filter(item => item.scope === 'provider').every(item => item.status === 'PASS');
  // Voice does not require a text model/token budget, but shares every transport/safety guard.
  const voiceReady = readMetaSpeechConfig(env) !== null && checks.filter(item => item.scope === 'provider' &&
    !['META_MUSE_MODEL', 'META_PROPOSAL_MAX_OUTPUT_TOKENS', 'META_CONVERSATION_REASONING_EFFORT'].includes(item.name)).every(item => item.status === 'PASS');
  const applicationReady = checks.every(item => item.status === 'PASS');
  return {
    schemaVersion: '1.0' as const,
    status: checks.some(item => item.status === 'INVALID') ? 'UNSAFE_CONFIGURATION' as const :
      applicationReady ? 'READY_FOR_LIVE_CHECK' as const : 'NOT_CONFIGURED' as const,
    providerReady, voiceReady, applicationReady, checks,
    providerVerified: false as const, deploymentVerified: false as const, liveRequestMade: false as const,
  };
}
