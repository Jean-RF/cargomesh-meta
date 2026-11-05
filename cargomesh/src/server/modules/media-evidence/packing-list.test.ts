import assert from 'node:assert/strict';
import test from 'node:test';
import {packingListText,validatePackingResult} from './packing-list';
export function packingPdf(text='PACKING LIST - Group A: 8 BOX. Group B: 4 BOX.'){
 const stream=`BT /F1 12 Tf 50 750 Td (${text.replace(/[()\\]/g,' ')}) Tj ET`;
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`];
 let pdf='%PDF-1.4\n';const offsets=[0];for(const [i,object] of objects.entries()){offsets.push(Buffer.byteLength(pdf));pdf+=`${i+1} 0 obj\n${object}\nendobj\n`;}
 const xref=Buffer.byteLength(pdf);pdf+=`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
 return new Uint8Array(Buffer.from(pdf));
}
const source=(quote:string)=>({source:'text',evidenceId:null,inputRevision:1,basis:'EXPLICIT',quote});
const shape=()=>({groups:[{label:'A',fields:[{field:'unitType',value:'BOX',provenance:source('8 BOX')},{field:'unitQuantity',value:8,provenance:source('8 BOX')}]},{label:'B',fields:[{field:'unitType',value:'BOX',provenance:source('4 BOX')},{field:'unitQuantity',value:4,provenance:source('4 BOX')}]}]});
test('actual PDF text extraction preserves both cargo lines',async()=>{const parsed=await packingListText(packingPdf());assert.equal(parsed.pages,1);assert.match(parsed.text,/8 BOX/);assert.match(parsed.text,/4 BOX/);});
test('empty or disguised PDF never reaches the model',async()=>{await assert.rejects(()=>packingListText(new Uint8Array(Buffer.from('Not a PDF'))));await assert.rejects(()=>packingListText(packingPdf(' ')));});
test('two groups remain distinct and do not produce legal approval or invented weight',()=>{const result=validatePackingResult(shape(),'Group A: 8 BOX. Group B: 4 BOX.',1,'a'.repeat(64),1);assert.equal(result.groups.length,2);assert.equal(result.groups[0].proposal.fields.find(f=>f.field==='unitQuantity')?.value,8);assert.equal(result.groups[1].proposal.fields.find(f=>f.field==='unitQuantity')?.value,4);assert.equal(result.regulatoryReview,'NOT_ASSESSED');assert.ok(result.missing.includes('Group 1: unitWeightKg'));assert.ok(result.requiresHumanConfirmation);});
test('quotes, revision and duplicate fields are verified at the model boundary',()=>{const missing=shape();missing.groups[0].fields[0].provenance.quote='invented label';assert.throws(()=>validatePackingResult(missing,'8 BOX 4 BOX',1,'a'.repeat(64),1));const stale=shape();stale.groups[0].fields[0].provenance.inputRevision=0;assert.throws(()=>validatePackingResult(stale,'8 BOX 4 BOX',1,'a'.repeat(64),1));const duplicate=shape();duplicate.groups[0].fields.push(duplicate.groups[0].fields[0]);assert.throws(()=>validatePackingResult(duplicate,'8 BOX 4 BOX',1,'a'.repeat(64),1));});
