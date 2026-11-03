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
