import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cwd = fileURLToPath(new URL('../', import.meta.url));
function run(args: string[], key = '') {
  // No env file is loaded and no real credential is inherited by this test.
  const result = spawnSync(process.execPath,
    ['--conditions=react-server', '--import', 'tsx', 'scripts/meta-media-smoke.ts', ...args], {
      cwd, encoding: 'utf8', timeout: 10_000, windowsHide: true,
      env: { ...process.env, CARGOMESH_AI_PROVIDER: 'META', META_MODEL_API_KEY: key,
        META_MUSE_MODEL: 'muse-spark-1.3', META_MODEL_BASE_URL: 'https://api.meta.ai/v1' },
    });
  assert.equal(result.error, undefined);
  assert.doesNotMatch(result.stdout + result.stderr, /synthetic-local-test-key|Bearer|data:image/);
  return { code: result.status, report: JSON.parse(result.stdout) };
}

test('both synthetic suites validate actual local files without credentials or recognition claims', () => {
  for (const args of [['--check'], ['--check', '--suite=luis']]) {
    const result = run(args);
    assert.equal(result.code, 0);
    assert.equal(result.report.status, 'PASS_INPUTS_ONLY');
    assert.equal(result.report.liveRequestMade, false);
    assert.equal(result.report.recognitionVerified, false);
    assert.equal(result.report.cases.length, 4);
    const images = result.report.cases.filter((item: { asset: string | null }) => item.asset);
    assert.equal(images.length, 3);
    assert.ok(images.every((item: { sha256: string; bytes: number }) => /^[a-f0-9]{64}$/.test(item.sha256) && item.bytes > 0));
  }
});

test('a configured key cannot turn a check or default invocation into live inference', () => {
  assert.equal(run(['--check', '--suite=luis'], 'synthetic-local-test-key').report.liveRequestMade, false);
  const result = run(['--suite=luis'], 'synthetic-local-test-key');
  assert.equal(result.code, 2);
  assert.equal(result.report.status, 'LIVE_OPT_IN_REQUIRED');
  assert.equal(result.report.liveRequestMade, false);
});

test('contradictory, repeated and unknown flags cannot invoke a provider', () => {
  for (const args of [['--live', '--check'], ['--check', '--check'], ['--report'], ['--suite=unknown']]) {
    const result = run(args, 'synthetic-local-test-key');
    assert.equal(result.code, 2);
    assert.equal(result.report.status, 'INVALID_ARGUMENTS');
    assert.equal(result.report.liveRequestMade, false);
  }
});

test('live mode with an empty private key fails before reading or sending media', () => {
  const result = run(['--live', '--suite=luis']);
  assert.equal(result.code, 2);
  assert.equal(result.report.status, 'NOT_CONFIGURED');
  assert.equal(result.report.liveRequestMade, false);
});

test('the local secrets file is ignored and never tracked', () => {
  assert.match(execFileSync('git', ['check-ignore', '.env.local'], { cwd, encoding: 'utf8', windowsHide: true }), /\.env\.local/);
  assert.equal(execFileSync('git', ['ls-files', '--', '.env.local'], { cwd, encoding: 'utf8', windowsHide: true }).trim(), '');
});
