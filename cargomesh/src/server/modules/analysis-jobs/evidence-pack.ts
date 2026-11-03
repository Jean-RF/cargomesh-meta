import type {AnalysisJobRecord} from "./ports";

export const DOCKMIND_EVIDENCE_SCHEMA = "dockmind.evidence.v1" as const;

/**
 * Procedencia en una palabra. Solo OWN_CAPTURE_REAL_INFERENCE sirve como evidencia de conteo real: captura propia
 * y SAM real. Un FIXTURE o un render sintético nunca lo son, aunque una persona haya revisado la cobertura.
 */
export type EvidenceLabel = "OWN_CAPTURE_REAL_INFERENCE" | "OWN_CAPTURE_WITHOUT_REAL_INFERENCE" | "SYNTHETIC_OR_FIXTURE" | "NO_OBSERVATION";

/**
 * Paquete para revisar un conteo sin abrir la base. Sale del job persistido y de una lectura nueva del video
 * anotado de su intento. No lleva URLs firmadas ni claves, y tampoco la referencia manual: esa solo la usa
 * `dockmind evaluate`, para que el conteo salga siempre del pipeline.
 */
export function buildEvidencePack(job: AnalysisJobRecord, overlayNow: {sha256: string; sizeBytes: number} | null, generatedAt: Date) {
  const o = job.observation;
  const label: EvidenceLabel = !o ? "NO_OBSERVATION"
    : o.clip.source !== "OWN_CAPTURE" ? "SYNTHETIC_OR_FIXTURE"
    : o.segmentation.segmenter === "META_SAM_API" && o.segmentation.real_inference ? "OWN_CAPTURE_REAL_INFERENCE"
    : "OWN_CAPTURE_WITHOUT_REAL_INFERENCE";
  return {
    schema: DOCKMIND_EVIDENCE_SCHEMA,
    generatedAt: generatedAt.toISOString(),
    label,
    identity: {
      jobId: job.jobId, attempt: job.attempt, organizationId: job.organizationId, sessionId: job.sessionId,
      evidenceId: job.evidenceId, groupId: job.groupId, manifestRevision: job.manifestRevision,
      // Lo declara el operador al pedir el análisis; la revisión humana lo confirma, el pipeline no lo infiere.
      coverage: job.coverage,
    },
    status: job.status,
    error: job.error,
    clip: {
      source: job.source,
      sha256Uploaded: job.clipSha256,
      sha256Analyzed: o?.clip.sha256 ?? null,
      sameBytes: o ? o.clip.sha256 === job.clipSha256 : null,
      original: o?.clip.original ?? null,
      analyzed: o?.clip.normalized ?? null,
      roi: o?.clip.roi ?? null,
      timeMapping: o?.clip.time_mapping ?? null,
    },
    config: {
      line: {from: [job.config.line.x1, job.config.line.y1], to: [job.config.line.x2, job.config.line.y2]},
      inside: [job.config.line.inside_x, job.config.line.inside_y],
      direction: "IN cruza hacia el punto de adentro; OUT, al revés. Coordenadas en fracciones del cuadro original.",
      unit: job.config.unit, concept: job.config.concept, margin: job.config.margin, minTrackFrames: job.config.min_track_frames,
    },
    provenance: o && {
      segmenter: o.segmentation.segmenter, realInference: o.segmentation.real_inference, model: o.segmentation.model,
      requestId: o.segmentation.request_id, analysisVersion: o.analysis_version, analyzedAt: o.created_at,
    },
    count: o && {
      status: o.result.status, entries: o.result.entries, exits: o.result.exits, net: o.result.net, unit: o.config.unit,
      events: o.result.events.map((e) => ({seconds: e.seconds, frame: e.frame, direction: e.direction, objectId: e.object_id})),
      reviewFlags: o.result.flags.map((f) => ({seconds: f.seconds, frame: f.frame, kind: f.kind, detail: f.detail})),
      tracksSeen: o.result.tracks_seen, tracksCounted: o.result.tracks_counted, maxObjectsInFrame: o.result.max_objects_in_frame,
    },
    // Consumo del proveedor de esta observación. Un intento que reusó la observación guardada no volvió a llamar a SAM.
    providerUsage: o && {
      billable: o.segmentation.segmenter === "META_SAM_API" && o.segmentation.real_inference,
      seconds: o.segmentation.seconds, boxes: o.segmentation.boxes, estimatedCostUsd: o.segmentation.estimated_cost_usd,
    },
    overlay: {
      object: job.overlayPath.split("/").at(-1) ?? null,
      status: job.overlay.status,
      sha256Stored: job.overlay.sha256,
      sha256Now: overlayNow?.sha256 ?? null,
      sizeBytesNow: overlayNow?.sizeBytes ?? null,
      verified: job.overlay.status === "VERIFIED" && overlayNow !== null && overlayNow.sha256 === job.overlay.sha256,
    },
    delivery: {status: job.delivery.status, tries: job.delivery.tries, observationId: job.delivery.observationId, deliveredAt: job.delivery.deliveredAt},
  };
}

export type DockMindEvidencePack = ReturnType<typeof buildEvidencePack>;
