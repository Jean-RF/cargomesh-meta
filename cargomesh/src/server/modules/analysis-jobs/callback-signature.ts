import {createHmac, timingSafeEqual} from "node:crypto";

/** Headers con los que el worker DockMind firma su callback (ver cargomesh/dockmind-worker/src/dockmind/jobs.py). */
export const DOCKMIND_SIGNATURE_HEADER = "x-dockmind-signature";
export const DOCKMIND_TIMESTAMP_HEADER = "x-dockmind-timestamp";
const DEFAULT_TOLERANCE_SECONDS = 300;

/** HMAC-SHA256 de `<timestamp>.<cuerpo crudo>`. El cuerpo debe ser el texto recibido, nunca un JSON re-serializado. */
export function signDockMindBody(rawBody: string, secret: string, timestamp: number): string {
  return `sha256=${createHmac("sha256", secret).update(`${timestamp}.`).update(rawBody, "utf8").digest("hex")}`;
}

export function verifyDockMindSignature(input: {
  rawBody: string; secret: string; timestamp: string | null; signature: string | null;
  nowSeconds: number; toleranceSeconds?: number;
}): boolean {
  const {rawBody, secret, timestamp, signature, nowSeconds} = input;
  if (!secret || !timestamp || !signature || !/^\d{1,12}$/.test(timestamp)) return false;
  const sent = Number(timestamp);
  if (Math.abs(nowSeconds - sent) > (input.toleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS)) return false;
  const expected = Buffer.from(signDockMindBody(rawBody, secret, sent));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
