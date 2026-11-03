import test from "node:test";
import assert from "node:assert/strict";
import {signDockMindBody, verifyDockMindSignature} from "./callback-signature";

// Vector calculado con dockmind.jobs.sign en Python: ambos lados deben firmar igual, incluso con UTF-8.
const BODY = '{"schema":"dockmind.result.v1","job_id":"ñandú-1"}';
const SECRET = "secreto-compartido";
const NOW = 1_800_000_000;
const PYTHON_SIGNATURE = "sha256=2c8c420440dfc28be8c59ea8f0499acd3a5142fd198d7bef8f419d8da6097d2f";

test("la firma coincide con la del worker en Python", () => {
  assert.equal(signDockMindBody(BODY, SECRET, NOW), PYTHON_SIGNATURE);
  assert.equal(verifyDockMindSignature({rawBody: BODY, secret: SECRET, timestamp: String(NOW), signature: PYTHON_SIGNATURE, nowSeconds: NOW}), true);
});

test("un cuerpo alterado, otro secreto o una firma vieja se rechazan", () => {
  const base = {rawBody: BODY, secret: SECRET, timestamp: String(NOW), signature: PYTHON_SIGNATURE, nowSeconds: NOW};
  assert.equal(verifyDockMindSignature({...base, rawBody: BODY.replace("1", "2")}), false);
  assert.equal(verifyDockMindSignature({...base, secret: "otro"}), false);
  assert.equal(verifyDockMindSignature({...base, nowSeconds: NOW + 301}), false);
});

test("faltan datos o vienen mal formados", () => {
  const base = {rawBody: BODY, secret: SECRET, timestamp: String(NOW), signature: PYTHON_SIGNATURE, nowSeconds: NOW};
  assert.equal(verifyDockMindSignature({...base, signature: null}), false);
  assert.equal(verifyDockMindSignature({...base, timestamp: "abc"}), false);
  assert.equal(verifyDockMindSignature({...base, secret: ""}), false);
  assert.equal(verifyDockMindSignature({...base, signature: "sha256=corta"}), false);
});
