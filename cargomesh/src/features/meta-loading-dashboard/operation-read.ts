import type {loadingApi} from './operation-api';

type Reader=Pick<typeof loadingApi,'read'|'passports'|'passport'>;
/** Independent authenticated reads share no outputs. Keep the exact selected
 * Passport (including its stale/current metadata); any denied read fails closed.
 * No persistent cache, background mutation or change to the caller's epoch guard.
 */
export async function readLoadingSessionView(api:Reader,id:string,selectedPassport:string|null){
 const [bundle,passports,passport]=await Promise.all([
  api.read(id),api.passports(id),selectedPassport?api.passport(id,selectedPassport):Promise.resolve(null),
 ]);
 return {bundle,passports,passport};
}

/** A request link is only a selection hint. Read it through the authenticated API,
 * including when it lies outside the first list page; never substitute a demo ID. */
export async function readLoadingCatalog(api:Pick<typeof loadingApi,'requests'|'facilities'|'request'>,requestHint?:string){
 const [requests,facilities]=await Promise.all([api.requests(),api.facilities()]);
 if(!requestHint||requests.data.some(r=>r.id===requestHint))return {requests,facilities};
 const selected=await api.request(requestHint);
 if(selected.id!==requestHint)throw Error('REQUEST_SCOPE_MISMATCH');
 return {requests:{...requests,data:[selected,...requests.data]},facilities};
}
