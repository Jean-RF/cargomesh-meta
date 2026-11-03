import {createHash} from "node:crypto";
import {MEDIA_HEAD_BYTES} from "./media-format";
import type {ClipStorage} from "./ports";
import {AnalysisJobError} from "./service";

/** Bucket privado creado por la migración `meta_dockmind_jobs` (50 MB, solo MP4/MOV). */
export const DOCKMIND_BUCKET = "meta-dockmind";
/** Supabase fija la validez de una URL de subida firmada en 2 horas. */
export const SIGNED_UPLOAD_SECONDS = 2 * 60 * 60;

type StorageError = {message: string; status?: number; statusCode?: string} | null;
type Files = {
  createSignedUploadUrl(path: string, options?: {upsert: boolean}): Promise<{data: {signedUrl: string} | null; error: StorageError}>;
  createSignedUrl(path: string, expiresIn: number): Promise<{data: {signedUrl: string} | null; error: StorageError}>;
  download(path: string): PromiseLike<{data: Blob | null; error: StorageError}>;
};
export type DockMindStorageClient = {storage: {from(bucket: string): Files}};

const missingObject = (error: NonNullable<StorageError>) =>
  error.status === 404 || error.statusCode === "404" || /not.?found/i.test(error.message);

function unavailable(error: StorageError): never {
  throw new AnalysisJobError("STORAGE_UNAVAILABLE", `Private clip storage failed: ${error?.message ?? "no data"}`.slice(0, 300), 503);
}

/** Lo usa solo el servidor, con la clave de servicio y después de autorizar al miembro. */
export function createSupabaseClipStorage(client: () => DockMindStorageClient, now: () => Date = () => new Date()): ClipStorage {
  const files = () => client().storage.from(DOCKMIND_BUCKET);
  return {
    async signedUploadUrl(path) {
      // Sin upsert: un original subido no se reemplaza; otro archivo es otro clip.
      const {data, error} = await files().createSignedUploadUrl(path);
      if (error || !data) unavailable(error);
      return {url: data.signedUrl, expiresAt: new Date(now().getTime() + SIGNED_UPLOAD_SECONDS * 1000).toISOString()};
    },
    async inspect(path) {
      const {data, error} = await files().download(path);
      if (error) {
        if (missingObject(error)) return null;
        unavailable(error);
      }
      if (!data) return null;
      const bytes = new Uint8Array(await data.arrayBuffer());
      return {sizeBytes: bytes.byteLength, sha256: createHash("sha256").update(bytes).digest("hex"), head: bytes.slice(0, MEDIA_HEAD_BYTES)};
    },
    async signedReadUrl(path, ttlSeconds) {
      const {data, error} = await files().createSignedUrl(path, ttlSeconds);
      if (error || !data) unavailable(error);
      return data.signedUrl;
    },
    async signedOverlayUploadUrl(path) {
      // Cada intento tiene su ruta y la subida solo crea: un worker viejo no alcanza la ruta del intento actual
      // y un envío repetido del mismo intento no reemplaza el video ya guardado.
      const {data, error} = await files().createSignedUploadUrl(path);
      if (error || !data) unavailable(error);
      return data.signedUrl;
    },
  };
}
