// Graba la carga del muelle 02 como clip sintético para DockMind (fuente SYNTHETIC_RENDER).
// Uso, desde cargomesh/:
//   node scripts/dockmind-depot-clip/render.mjs --variant complete --out <dir>
//   node scripts/dockmind-depot-clip/render.mjs --still 45 --out <dir>      un cuadro para encuadrar
// Como verify-depot-preview.mjs, no instala nada: usa un Playwright ya instalado
// (CARGOMESH_PLAYWRIGHT_MODULE), el Chrome del equipo (CARGOMESH_CHROMIUM_EXECUTABLE) y FFmpeg
// (CARGOMESH_FFMPEG_EXECUTABLE o `ffmpeg` en el PATH).
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
// esbuild llega con tsx, que ya es dependencia de desarrollo.
const esbuild = createRequire(require.resolve('tsx'))('esbuild');
const packagePath = process.env.CARGOMESH_PLAYWRIGHT_MODULE || 'playwright';
const { chromium } = packagePath === 'playwright' ? require(packagePath) : await import(pathToFileURL(packagePath).href);

const { values: args } = parseArgs({ options: {
  variant: { type: 'string', default: 'complete' }, out: { type: 'string' }, still: { type: 'string' },
  fps: { type: 'string', default: '30' }, camera: { type: 'string' }, template: { type: 'string', default: 'distribution' },
} });
assert.ok(args.out, 'Falta --out <directorio>, fuera del repositorio');
assert.ok(['complete', 'missing-one'].includes(args.variant), '--variant es complete o missing-one');
const out = path.resolve(args.out), fps = Number(args.fps);
// Ciclo de la sede: el camión ya está atracado a los 34 s y la carga va de 36 a 57 s.
const START = 34, END = 59, WIDTH = 1280, HEIGHT = 720;
// Cámara fija dentro de la nave, a 3,2 m de altura y a un lado del pasillo del muelle 02:
// se ve todo el recorrido del montacargas y, por la puerta abierta, el interior del remolque.
const camera = args.camera ? JSON.parse(args.camera) : { position: [.8, 3.2, -2.8], target: [3.2, 1, 0], fov: 60 };
const name = `muelle02_${args.variant === 'complete' ? 'completa' : 'falta_una'}`;

await fs.mkdir(out, { recursive: true });
const bundle = await esbuild.build({
  entryPoints: [path.join(here, 'scene.ts')], bundle: true, write: false, format: 'iife', target: 'es2022',
  tsconfig: path.resolve(here, '../../tsconfig.json'), logLevel: 'warning',
});
const browser = await chromium.launch({ headless: true, executablePath: process.env.CARGOMESH_CHROMIUM_EXECUTABLE || undefined });
try {
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setContent('<!doctype html><html><body style="margin:0;background:#000"></body></html>');
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  await page.evaluate(setup => window.dockmindClip.setup(setup), { width: WIDTH, height: HEIGHT, variant: args.variant, template: args.template, camera });
  assert.deepEqual(errors, [], 'La escena falló');
  const line = await page.evaluate(() => window.dockmindClip.line());
  const render = async seconds => {
    const result = await page.evaluate(t => window.dockmindClip.frame(t), seconds);
    return { ...result, image: Buffer.from(result.image.slice(result.image.indexOf(',') + 1), 'base64') };
  };

  if (args.still !== undefined) {
    const file = path.join(out, `still-${args.still}.jpg`);
    await fs.writeFile(file, (await render(Number(args.still))).image);
    console.log(JSON.stringify({ still: file, line }, null, 2));
  } else {
    const video = path.join(out, `${name}.mp4`);
    const encoder = spawn(process.env.CARGOMESH_FFMPEG_EXECUTABLE || 'ffmpeg', ['-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', 'pipe:0',
      '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', '-y', video], { windowsHide: true });
    let stderr = '';
    encoder.stderr.on('data', data => { stderr = (stderr + data).slice(-4096); });
    const done = new Promise(resolve => { encoder.on('error', error => resolve({ code: -1, message: error.message })); encoder.on('exit', code => resolve({ code, message: stderr })); });
    // La referencia sale de la propia simulación: el segundo en que el pallet llevado cruza la puerta.
    const crossings = [];
    let previous = null;
    const frames = Math.round((END - START) * fps);
    for (let index = 0; index < frames; index++) {
      const clipSeconds = index / fps, { image, carried } = await render(START + clipSeconds);
      if (previous !== null && carried !== null && previous < line.door_z && carried >= line.door_z) crossings.push({ seconds: clipSeconds, direction: 'IN' });
      if (previous !== null && carried !== null && previous >= line.door_z && carried < line.door_z) crossings.push({ seconds: clipSeconds, direction: 'OUT' });
      previous = carried;
      if (!encoder.stdin.write(image)) await new Promise(resolve => encoder.stdin.once('drain', resolve));
    }
    encoder.stdin.end();
    const result = await done;
    assert.equal(result.code, 0, `FFmpeg: ${result.message}`);
    assert.deepEqual(errors, [], 'La escena falló durante la grabación');
    const net = crossings.reduce((sum, c) => sum + (c.direction === 'IN' ? 1 : -1), 0);
    const reference = ['clip,segundo,direccion,total_esperado', ...crossings.map(c => `${name}.mp4,${c.seconds.toFixed(2)},${c.direction},${net}`)].join('\n') + '\n';
    await fs.writeFile(path.join(out, `referencia_${name}.csv`), reference);
    const { door_z: _, ...dockmindLine } = line;
    await fs.writeFile(path.join(out, `${name}.line.json`), JSON.stringify({ ...dockmindLine, unit: 'PALLET', concept: 'pallet', source: 'SYNTHETIC_RENDER', camera }, null, 2) + '\n');
    console.log(JSON.stringify({ video, frames, fps, crossings, net, line: dockmindLine }, null, 2));
  }
} finally {
  await browser.close();
}
