import {createHash} from 'node:crypto';
import {crc32,inflateSync} from 'node:zlib';
import {z} from 'zod';
import {DOCUMENT_LIMIT,DocumentMetadata,DocumentRevision,DocumentCommand,DocumentReview} from '@/shared/schemas/meta/documents';
import {V2DraftError} from '../freight-requests/application/draft-service';
export type DocumentActor={organizationId:string|null;actorId:string;carrierId:string|null};
export interface DocumentRepository{call(actor:DocumentActor,action:string,target:string|null,value:unknown,key:string|null):Promise<unknown>}
export interface DocumentStorage{
  put(path:string,bytes:Uint8Array,mime:string):Promise<void>;
  signed(path:string,filename:string):Promise<string>;
}
const Id=z.string().uuid(),Stored=z.object({data:DocumentRevision,objectPath:z.string().regex(/^[a-f0-9-]{36}\/[a-f0-9-]{36}\/[a-f0-9-]{36}$/)});
const fail=(code:string,message:string,status=400):never=>{throw new V2DraftError(code,message,status);};
/** Validate actual content, not caller extension/MIME. No antivirus or legal validation is implied. */
export async function inspectDocument(bytes:Uint8Array,declaredMime:string){
 if(!bytes.length||bytes.length>DOCUMENT_LIMIT)fail('DOCUMENT_SIZE','Use a non-empty file up to 4 MiB.',413);
 const b=Buffer.from(bytes);let mime:string;
 if(b.subarray(0,8).toString('ascii').match(/^%PDF-1\.[0-7]/)){
  const text=b.toString('latin1');
  const names=text.replace(/#([0-9a-f]{2})/gi,(_,hex:string)=>String.fromCharCode(parseInt(hex,16)));
  const xref=/startxref\s+(\d+)\s+%%EOF\s*$/.exec(text),offset=xref?Number(xref[1]):-1;
  const table=offset>=0?text.slice(offset,offset+512):'';
  if(!xref||offset>=b.length||!(/^(?:xref\b|\d+\s+\d+\s+obj\b[\s\S]*?\/Type\s*\/XRef\b)/.test(table))||!(/\/Type\s*\/Catalog\b/.test(names))||/\/(?:JavaScript|JS|Launch|EmbeddedFile|RichMedia|OpenAction|XFA|Encrypt|ObjStm)\b/i.test(names))fail('UNSUPPORTED_DOCUMENT','Use a plain, unencrypted PDF without scripts, compressed objects or attachments.');
  mime='application/pdf';
 }else{
  let width=0,height=0;
  if(b.length>=33&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&b.subarray(12,16).toString()==='IHDR'){
   mime='image/png';width=b.readUInt32BE(16);height=b.readUInt32BE(20);
  }else if(b.length>=4&&b[0]===255&&b[1]===216&&b[b.length-2]===255&&b[b.length-1]===217){
   mime='image/jpeg';let pos=2;
   while(pos+4<b.length){if(b[pos++]!==255)break;while(b[pos]===255)pos++;const marker=b[pos++];if(marker===218||marker===217)break;const length=b.readUInt16BE(pos);if(length<2||pos+length>b.length)break;
    if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)&&length>=8){height=b.readUInt16BE(pos+3);width=b.readUInt16BE(pos+5);break;}pos+=length;
   }
  }else return fail('UNSUPPORTED_DOCUMENT','Only PDF, PNG or JPEG files are accepted.');
  if(!width||!height||width*height>16000000||width>10000||height>10000)fail('DOCUMENT_IMAGE_LIMIT','Image dimensions are invalid or too large.');
  if(mime==='image/png'){
   try{
    let pos=8,ended=false;const chunks:Buffer[]=[];
    while(pos+12<=b.length){const size=b.readUInt32BE(pos),end=pos+8+size;if(end+4>b.length||size>DOCUMENT_LIMIT)throw new Error('chunk');const type=b.subarray(pos+4,pos+8).toString();
     if(crc32(b.subarray(pos+4,end))!==b.readUInt32BE(end))throw new Error('crc');
     if(type==='IDAT')chunks.push(b.subarray(pos+8,end));
     if(type==='IEND'){if(size!==0||end+4!==b.length)throw new Error('end');ended=true;break;}pos=end+4;
    }
    const channels:Record<number,number>={0:1,2:3,3:1,4:2,6:4};const channel=channels[b[25]];
    if(!ended||!chunks.length||b[24]!==8||b[26]!==0||b[27]!==0||b[28]!==0||!channel)throw new Error('unsupported png');
    const stride=width*channel+1,expected=height*stride,decoded=inflateSync(Buffer.concat(chunks),{maxOutputLength:expected});
    if(decoded.length!==expected)throw new Error('pixels');for(let y=0;y<height;y++)if(decoded[y*stride]>4)throw new Error('filter');
   }catch{return fail('INVALID_DOCUMENT_IMAGE','Use a complete, non-interlaced 8-bit PNG image.');}
  }else{
   // Parse the JPEG container without running an untrusted native graphics decoder in the web process.
   let pos=2,sawScan=false,sawQuantization=false,sawHuffman=false;
   while(pos<b.length-1){if(b[pos++]!==255)fail('INVALID_DOCUMENT_IMAGE','Invalid JPEG marker.');while(b[pos]===255)pos++;const marker=b[pos++];
    if(marker===217){if(pos!==b.length||!sawScan||!sawQuantization||!sawHuffman)fail('INVALID_DOCUMENT_IMAGE','Incomplete JPEG.');break;}
    if(pos+2>b.length)fail('INVALID_DOCUMENT_IMAGE','Incomplete JPEG.');const length=b.readUInt16BE(pos);if(length<2||pos+length>b.length)fail('INVALID_DOCUMENT_IMAGE','Invalid JPEG segment.');
    sawQuantization||=marker===219;sawHuffman||=marker===196;pos+=length;
    if(marker===218){sawScan=true;while(pos<b.length-1){if(b[pos]!==255){pos++;continue;}const next=b[pos+1];if(next===0||next>=208&&next<=215){pos+=2;continue;}break;}}
   }
   if(!sawScan||pos!==b.length)fail('INVALID_DOCUMENT_IMAGE','Incomplete JPEG image.');
  }
 }
 if(declaredMime&&declaredMime!==mime)fail('DOCUMENT_TYPE_MISMATCH','File content does not match its declared type.');
 return {mime,sha256:createHash('sha256').update(b).digest('hex'),bytes:b.length};
}
export class DocumentService{
 constructor(private repository:DocumentRepository,private storage:DocumentStorage){}
 async upload(actor:DocumentActor,raw:unknown,file:{name:string;type:string;bytes:Uint8Array},key:unknown){
  const metadata=DocumentMetadata.parse(raw),id=Id.parse(key);
  const content=await inspectDocument(file.bytes,file.type);
  const filename=z.string().min(1).max(200).parse(file.name.replace(/[\x00-\x1f\x7f/\\\u202a-\u202e\u2066-\u2069]/g,'_'));
  const extension:Record<string,RegExp>={'application/pdf':/\.pdf$/i,'image/png':/\.png$/i,'image/jpeg':/\.jpe?g$/i};
  if(!extension[content.mime].test(filename))fail('DOCUMENT_TYPE_MISMATCH','Filename extension must match its content.');
  const reserved=Stored.parse(await this.repository.call(actor,'upload',null,{...metadata,...content,filename},id));
  if(reserved.data.organizationId!==actor.organizationId||reserved.objectPath!==`${actor.organizationId}/${reserved.data.documentId}/${reserved.data.id}`||reserved.data.sha256!==content.sha256||reserved.data.mime!==content.mime||reserved.data.bytes!==content.bytes)fail('DOCUMENT_SCOPE_MISMATCH','Invalid document response.',502);
  await this.storage.put(reserved.objectPath,file.bytes,content.mime);
  // Stable separate key: a retry of the upload must reuse both persisted commands.
  const digest=createHash('sha256').update(`document-finalize:${id}`).digest('hex');
  const finishKey=`${digest.slice(0,8)}-${digest.slice(8,12)}-4${digest.slice(13,16)}-a${digest.slice(17,20)}-${digest.slice(20,32)}`;
  return z.object({data:DocumentRevision}).parse(await this.repository.call(actor,'finish',reserved.data.id,{},finishKey));
 }
 async command(actor:DocumentActor,requestId:string,raw:unknown,key:unknown){const v=DocumentCommand.parse(raw);return z.record(z.unknown()).parse(await this.repository.call(actor,v.action,Id.parse(requestId),v,Id.parse(key)));}
 async review(actor:DocumentActor,shareId:string,raw:unknown,key:unknown){const v=DocumentReview.parse(raw);return z.record(z.unknown()).parse(await this.repository.call(actor,'review',Id.parse(shareId),v,Id.parse(key)));}
 async library(actor:DocumentActor,query:unknown){const v=z.object({requestId:Id.optional(),documentId:Id.optional(),offset:z.coerce.number().int().min(0).max(1000000).default(0)}).strict().parse(query);return z.record(z.unknown()).parse(await this.repository.call(actor,'library',null,v,null));}
 async dossier(actor:DocumentActor,id:string){return z.record(z.unknown()).parse(await this.repository.call(actor,actor.carrierId?'carrier_dossier':'dossier',Id.parse(id),{},null));}
 async download(actor:DocumentActor,id:string){
  const saved=Stored.parse(await this.repository.call(actor,'download',Id.parse(id),{},null));
  if(!actor.carrierId&&saved.data.organizationId!==actor.organizationId)fail('DOCUMENT_SCOPE_MISMATCH','Invalid document response.',502);
  return {url:await this.storage.signed(saved.objectPath,saved.data.filename),expiresIn:60};
 }
}
