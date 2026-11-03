/**
 * Formato real del clip según sus primeros bytes, no según la extensión ni el tipo que declaró el navegador.
 * MP4 y MOV son contenedores ISO/QuickTime: empiezan con una caja `ftyp` cuyas marcas dicen la familia,
 * o (QuickTime antiguo) directamente con `moov`, `mdat`, `wide`, `free`, `skip` o `pnot`.
 * Las marcas de imagen o audio del mismo contenedor (HEIC, AVIF, M4A) no son video y se rechazan.
 */
const VIDEO_BRANDS = new Set([
  "isom", "iso2", "iso3", "iso4", "iso5", "iso6", "iso8", "iso9", "mp41", "mp42", "mp71", "avc1", "M4V ", "M4VH", "M4VP",
  "dash", "3gp4", "3gp5", "3gp6", "3g2a", "MSNV", "XAVC", "f4v ", "NDAS", "mmp4",
]);
const QUICKTIME_ATOMS = new Set(["moov", "mdat", "wide", "free", "skip", "pnot"]);
/** Marcas principales de imagen o audio: aunque declaren compatibilidad con isom, no son video. */
const NOT_VIDEO = new Set(["M4A ", "M4B ", "M4P ", "heic", "heix", "hevc", "mif1", "msf1", "avif", "avis", "jp2 ", "crx "]);
/** Bytes que el servidor necesita leer para decidir. */
export const MEDIA_HEAD_BYTES = 256;

const text = (bytes: Uint8Array, start: number) => String.fromCharCode(...bytes.subarray(start, start + 4));

export function detectContainer(head: Uint8Array): "MP4" | "MOV" | null {
  if (head.length < 12) return null;
  const type = text(head, 4);
  if (type !== "ftyp") return QUICKTIME_ATOMS.has(type) ? "MOV" : null;
  const size = new DataView(head.buffer, head.byteOffset, head.byteLength).getUint32(0);
  const end = Math.min(head.length, size >= 16 ? size : 16);
  // Marca principal (8..12) y compatibles desde el byte 16; los bytes 12..16 son la versión menor.
  if (NOT_VIDEO.has(text(head, 8))) return null;
  const brands = [text(head, 8)];
  for (let offset = 16; offset + 4 <= end; offset += 4) brands.push(text(head, offset));
  if (brands.includes("qt  ")) return "MOV";
  return brands.some((brand) => VIDEO_BRANDS.has(brand)) ? "MP4" : null;
}
