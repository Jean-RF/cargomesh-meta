import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import test from 'node:test';
import {inspectTruckGlb} from '../logistics-3d/truck-glb';

test('CARLA prototype stays portable, attributed and within the shared import boundary',()=>{
  const file=readFileSync(new URL('../../../public/truck-reference/hgv.glb',import.meta.url));
  const buffer=file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength);
  assert.deepEqual(inspectTruckGlb(buffer),{triangles:189987,meshes:10,bytes:12052440});
  const json=JSON.parse(file.subarray(20,20+file.readUInt32LE(12)).toString('utf8'));
  assert.equal(json.images.length,14);
  assert(json.images.every((image:{uri?:string;bufferView?:number})=>image.uri===undefined&&Number.isInteger(image.bufferView)));
  assert(json.nodes.some((node:{extras?:{license?:string;attribution?:string}})=>node.extras?.license==='CC-BY-4.0'&&node.extras.attribution?.includes('CARLA Simulator')));
  const license=readFileSync(new URL('../../../public/truck-reference/LICENSE.md',import.meta.url),'utf8');
  assert(license.includes(createHash('sha256').update(file).digest('hex')));
});
