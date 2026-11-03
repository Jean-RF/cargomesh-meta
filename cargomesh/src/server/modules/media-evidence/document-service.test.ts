import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createCanvas} from '@napi-rs/canvas';
import {DocumentService,inspectDocument,type DocumentRepository,type DocumentStorage} from './document-service';
import {DocumentMetadata,DOCUMENT_LIMIT} from '@/shared/schemas/meta/documents';
const id=(n:number)=>`d0510000-0000-4000-8000-${String(n).padStart(12,'0')}`;
export function pdfFixture(extra=''){
 let text='%PDF-1.4\n',offsets=[0];
 for(const [index,value] of ['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>',`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] ${extra} >>`].entries()){offsets.push(Buffer.byteLength(text));text+=`${index+1} 0 obj\n${value}\nendobj\n`;}
 const start=Buffer.byteLength(text);text+='xref\n0 4\n0000000000 65535 f \n'+offsets.slice(1).map(n=>`${String(n).padStart(10,'0')} 00000 n \n`).join('')+`trailer\n<< /Root 1 0 R /Size 4 >>\nstartxref\n${start}\n%%EOF\n`;return Buffer.from(text);
}
test('actual file inspection rejects empty, oversized, spoofed, encrypted, scripted and invalid PDF content',async()=>{
 for(const bytes of [Buffer.from(''),Buffer.alloc(DOCUMENT_LIMIT+1),Buffer.from('<svg/>'),Buffer.from('%PDF-1.4\n%%EOF'),pdfFixture('/J#61vaScript (alert)'),pdfFixture('/Encrypt true')])await assert.rejects(()=>inspectDocument(bytes,'application/pdf'));
 await assert.rejects(()=>inspectDocument(pdfFixture(),'image/png'));
 const result=await inspectDocument(pdfFixture(),'application/pdf');assert.equal(result.mime,'application/pdf');assert.equal(result.sha256,createHash('sha256').update(pdfFixture()).digest('hex'));
});
test('bounded structural image validation accepts actual PNG/JPEG and rejects incomplete or excessive images',async()=>{
 const canvas=createCanvas(3,3);for(const mime of ['image/png','image/jpeg'] as const){const bytes=mime==='image/png'?canvas.toBuffer('image/png'):canvas.toBuffer('image/jpeg');assert.equal((await inspectDocument(bytes,mime)).mime,mime);}
 const png=canvas.toBuffer('image/png');await assert.rejects(()=>inspectDocument(png.subarray(0,33),'image/png'));
 const large=Buffer.from(png);large.writeUInt32BE(100000,16);await assert.rejects(()=>inspectDocument(large,'image/png'));
});
test('packing list scope and issue/expiry are explicit, never inferred from a file',()=>{
 assert.equal(DocumentMetadata.safeParse({title:'List',kind:'PACKING_LIST',expectedVersion:0}).success,false);
 assert.equal(DocumentMetadata.safeParse({title:'Company',kind:'COMPANY_PROFILE',requestId:id(3),expectedVersion:0}).success,false);
 assert.equal(DocumentMetadata.safeParse({title:'Company',kind:'COMPANY_PROFILE',expectedVersion:0,issuedOn:'2026-11-02',expiresOn:'2026-11-01'}).success,false);
});
test('upload retry keeps revision, object path and finalization key without creating duplicate document intents',async()=>{
 const calls:{action:string;key:string|null}[]=[],paths:string[]=[];const bytes=pdfFixture();
 const revision={id:id(1),documentId:id(2),organizationId:id(3),title:'Profile',kind:'COMPANY_PROFILE',requestId:null,version:1,documentVersion:1,filename:'profile.pdf',mime:'application/pdf',bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),state:'UPLOADING',issuedOn:null,expiresOn:null,createdAt:'2026-10-30T00:00:00Z'};
 const repo:DocumentRepository={async call(_a,action,_t,_v,key){calls.push({action,key});return action==='upload'?{data:revision,objectPath:`${id(3)}/${id(2)}/${id(1)}`}:{data:{...revision,state:'READY'}};}};
 let attempts=0;const storage:DocumentStorage={async put(path){paths.push(path);if(attempts++===0)throw new Error('interrupted');},async signed(){return 'https://example.invalid';}};
 const service=new DocumentService(repo,storage),actor={organizationId:id(3),actorId:id(4),carrierId:null},metadata={title:'Profile',kind:'COMPANY_PROFILE',expectedVersion:0};
 await assert.rejects(()=>service.upload(actor,metadata,{name:'profile.pdf',type:'application/pdf',bytes},id(5)));
 const saved=await service.upload(actor,metadata,{name:'profile.pdf',type:'application/pdf',bytes},id(5));assert.equal(saved.data.state,'READY');
 await service.upload(actor,metadata,{name:'profile.pdf',type:'application/pdf',bytes},id(5));
 assert.equal(new Set(paths).size,1);assert.equal(new Set(calls.filter(c=>c.action==='finish').map(c=>c.key)).size,1);
 assert.equal(new Set(calls.filter(c=>c.action==='upload').map(c=>c.key)).size,1);
});
test('invalid upload never reserves metadata and unsigned download cannot bypass the repository',async()=>{
 let calls=0,signed=0;const service=new DocumentService({async call(){calls++;throw new Error('denied');}},{async put(){throw new Error('must not upload');},async signed(){signed++;return 'https://example.invalid';}});
 await assert.rejects(()=>service.upload({organizationId:id(1),actorId:id(2),carrierId:null},{title:'Profile',kind:'COMPANY_PROFILE',expectedVersion:0},{name:'bad.pdf',type:'application/pdf',bytes:Buffer.from('bad')},id(3)));assert.equal(calls,0);
 await assert.rejects(()=>service.upload({organizationId:id(1),actorId:id(2),carrierId:null},{title:'Profile',kind:'COMPANY_PROFILE',expectedVersion:0},{name:'bad.exe',type:'application/pdf',bytes:pdfFixture()},id(3)));assert.equal(calls,0);
 await assert.rejects(()=>service.download({organizationId:null,actorId:id(2),carrierId:id(3)},id(4)));assert.equal(signed,0);
});
