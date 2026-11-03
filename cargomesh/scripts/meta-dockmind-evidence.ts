/**
 * Paquete de evidencia de jobs DockMind: identidad (job, intento, grupo, revisión y cobertura), configuración,
 * procedencia e indicador real_inference, marcas de tiempo, incertidumbre, consumo del proveedor y el video anotado
 * del intento, verificado con una lectura nueva del bucket. Sale del job persistido, no de lo que diga el worker.
 *
 * Usa la clave de servicio del entorno: el .env.local de la app local o el del entorno Meta autorizado. Escribe y
 * muestra solo IDs, hashes y conteos; nunca URLs firmadas ni claves.
 *
 * Uso, desde cargomesh/:
 *   pnpm evidence:meta-dockmind --out <carpeta> <jobId> [<jobId>...]
 * Escribe <carpeta>/<jobId>-a<intento>/evidencia.json. Después, la comparación con la referencia manual por grupo:
 *   cd dockmind-worker && python -m dockmind evaluate --reference clips/referencia.csv --observations <carpeta>
 */
import {mkdirSync, writeFileSync} from "node:fs";
import {join, resolve} from "node:path";
import {parseArgs} from "node:util";

async function main() {
  const {values, positionals} = parseArgs({options: {out: {type: "string"}}, allowPositionals: true});
  if (!values.out || positionals.length === 0) throw new Error("Uso: --out <carpeta> <jobId> [<jobId>...]");
  const {dockmindServerDeps} = await import("../src/server/modules/analysis-jobs/wiring");
  const {buildEvidencePack} = await import("../src/server/modules/analysis-jobs/evidence-pack");
  const server = dockmindServerDeps();
  for (const jobId of positionals) {
    const job = await server.ledger.get(jobId);
    if (!job) throw new Error(`No existe el job ${jobId}`);
    const overlay = job.overlay.status === "NONE" ? null : await server.overlays.inspect(job.overlayPath);
    const pack = buildEvidencePack(job, overlay, new Date());
    const folder = resolve(values.out, `${job.jobId}-a${job.attempt}`);
    mkdirSync(folder, {recursive: true});
    writeFileSync(join(folder, "evidencia.json"), `${JSON.stringify(pack, null, 2)}\n`);
    const count = pack.count ? `${pack.count.status}, neto ${pack.count.net} ${pack.count.unit}` : job.status;
    console.log(`${job.jobId} intento ${job.attempt}: ${pack.label}; grupo ${job.groupId} (${job.coverage}); ${count}; video ${pack.overlay.verified ? "verificado" : pack.overlay.status}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "No se pudo armar la evidencia");
  process.exit(1);
});
