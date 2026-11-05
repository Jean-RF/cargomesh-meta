import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import test from 'node:test';
import * as settings from './client-settings-api';
import * as organization from '@/shared/schemas/v2/organization';
const code=ts.transpileModule(readFileSync(new URL('./client-organization.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
type Node={type:unknown;props:Record<string,unknown>};
function flatten(value:unknown):Node[]{if(Array.isArray(value))return value.flatMap(flatten);if(value&&typeof value==='object'&&'props' in value){const node=value as Node;return [node,...flatten(node.props.children)];}return [];}
function text(value:unknown):string{if(Array.isArray(value))return value.map(text).join(' ');if(value&&typeof value==='object'&&'props' in value)return text((value as Node).props.children);return typeof value==='string'?value:'';}
function setup(read:()=>Promise<unknown>,initialTab:string|null=null){
 const slots:unknown[]=[],effects:Array<()=>void>=[];let cursor=0,changed=false,tab=initialTab;
 const docs=()=>null;const hooks={
  useState(initial:unknown){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?(initial as ()=>unknown)():initial;return [slots[i],(value:unknown)=>{const next=typeof value==='function'?(value as (v:unknown)=>unknown)(slots[i]):value;if(!Object.is(next,slots[i])){slots[i]=next;changed=true;}}];},
  useRef(initial:unknown){const i=cursor++;if(!(i in slots))slots[i]={current:initial};return slots[i];},
  useEffect(callback:()=>void|(()=>void),deps:unknown[]){const i=cursor++,old=slots[i] as {deps:unknown[];cleanup?:()=>void}|undefined;if(!old||old.deps.length!==deps.length||deps.some((v,j)=>!Object.is(v,old.deps[j]))){effects.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:callback()};});}},
 };
 const exports:{ClientOrganization:(p:unknown)=>unknown}={} as never;
 const jsx=(type:unknown,props:Record<string,unknown>)=>({type,props});
 vm.runInNewContext(code,{exports,Intl,require:(name:string)=>{
  if(name==='react')return hooks;if(name==='react/jsx-runtime')return {jsx,jsxs:jsx,Fragment:'Fragment'};
  if(name==='next/navigation')return {useSearchParams:()=>({get:()=>tab}),usePathname:()=>'/clients/organization'};
  if(name.includes('i18n/locale-provider'))return {useLocale:()=>({t:(_es:string,en:string)=>en,locale:'en',localeTag:'en-US'})};
  if(name.includes('schemas/v2/organization'))return organization;
  if(name==='./client-settings-api')return {...settings,settingsRequest:read};
  if(name.includes('documents/document-panel'))return {OrganizationDocuments:docs};
  if(name.includes('client-profile-settings'))return {ClientCatalogSettings:()=>null};
  if(name==='./organization-overview')return {OrganizationOverview:()=>null};
  if(name==='./operations-query')return {operationsHistoryState:(value:unknown)=>value};
  if(name==='lucide-react')return new Proxy({},{get:()=>()=>null});
  if(name==='@/components/ui')return {Button:'button',Input:'input',Select:'select'};
  if(name.includes('workspace-link'))return {WorkspaceLink:'a'};
  if(name.endsWith('.module.css'))return {default:new Proxy({},{get:(_t,key)=>String(key)})};
  throw Error(`Unexpected import: ${name}`);
 }});
 function render(){let tree:unknown;for(let i=0;i<20;i++){cursor=0;changed=false;tree=exports.ClientOrganization({role:'SUPERVISOR',preview:false});while(effects.length)effects.shift()!();if(!changed)return tree;}throw Error('Unstable organization render');}
 const settle=async()=>{for(let i=0;i<4;i++){await new Promise(setImmediate);render();}return render();};
 return {render,settle,docs,navigate:(value:string|null)=>{tab=value;return render();}};
}
const profile=organization.OrganizationRecordV2Schema.parse({id:'c2300000-0000-4000-8000-000000000001',version:1,createdAt:'2026-10-28T12:00:00Z',updatedAt:'2026-11-04T12:00:00Z',value:{schemaVersion:'2.0',code:'QA-V2-A',commercialName:'Actual saved organization',legalName:null,taxIdType:null,taxIdValue:null,countryCode:'PE',corporateEmail:null,corporatePhone:null,defaultCurrency:'PEN',status:'ACTIVE'}});
test('deep-linked documents mount independently while the profile endpoint is pending or fails',async()=>{
 let reject!:(reason:Error)=>void;const pending=new Promise((_,no)=>{reject=no;});const app=setup(()=>pending,'documents');
 assert.ok(flatten(app.render()).some(node=>node.type===app.docs));reject(new settings.ClientSettingsError('PROFILE_UNAVAILABLE',503,'offline'));
 const tree=await app.settle();assert.ok(flatten(tree).some(node=>node.type===app.docs));assert.doesNotMatch(text(tree),/Pacific Produce|ops@pacificproduce|Verified Client/);
});
test('documents can open after an overview read error without reloading the component',async()=>{
 const app=setup(async()=>{throw new settings.ClientSettingsError('VALIDATION_ERROR',400,'profile failed');});await app.settle();
 const tree=app.navigate('documents');assert.ok(flatten(tree).some(node=>node.type===app.docs));
});
test('successful PEN profile shows the real organization without invented verification or relative activity',async()=>{
 const app=setup(async()=>({data:profile}));app.render();const tree=await app.settle();assert.match(text(tree),/Actual saved organization/);assert.doesNotMatch(text(tree),/Pacific Produce|Verified Client|Yesterday|2 days ago|Just now/);
});
