import {Hono,type MiddlewareHandler} from 'hono';
import {bodyLimit} from 'hono/body-limit';
import {z} from 'zod';
import {hasSessionOrigin} from '@/server/auth/session-origin';
import {V2DraftError} from '@/server/modules/freight-requests/application/draft-service';
import {LoadingOperationService} from '@/server/modules/loading-sessions/operation-service';
import type {AuthVariables} from '../../middleware/auth';
import {v2AuthMiddleware} from '../../middleware/v2-auth';
import {v2Error} from '../../middleware/v2-error';

import type {PassportExplanationService} from '@/server/modules/loading-sessions/passport-explanation-service';
type Dependencies={service:()=>Promise<LoadingOperationService>;explanations?:()=>Promise<PassportExplanationService>;authenticate?:MiddlewareHandler<{Variables:AuthVariables}>};
export function createLoadingSessionsRouter(deps:Dependencies){
  const router=new Hono<{Variables:AuthVariables}>(),base='/meta/loading-sessions';
  // Hono /* also matches the collection root. A single registration retains
  // every guard without authenticating the same request twice.
  for(const path of [`${base}/*`]){
    router.use(path,async(c,next)=>{c.header('Cache-Control','private, no-store');c.header('Vary','Cookie, Authorization');await next();});
    router.use(path,deps.authenticate??v2AuthMiddleware);
    router.use(path,async(c,next)=>{
      if(c.req.method==='POST'&&!c.req.header('Authorization')&&!hasSessionOrigin(c.req.raw))return v2Error(c,new V2DraftError('FORBIDDEN_ORIGIN','Same-origin session command required.',403));
      await next();
    });
    router.use(path,bodyLimit({maxSize:32768,onError:c=>v2Error(c,new V2DraftError('PAYLOAD_TOO_LARGE','Loading command exceeds 32 KiB.',413))}));
  }
  router.get(base,async c=>{try{
    const result=await (await deps.service()).list(c.get('member'),c.req.query());
    return c.json({...result,meta:{...result.meta,canOperate:['OWNER','SUPERVISOR'].includes(c.get('member').role)}});
  }catch(e){return v2Error(c,e);}});
  router.get(`${base}/:sessionId`,async c=>{try{return c.json(await (await deps.service()).read(c.get('member'),c.req.param('sessionId')));}catch(e){return v2Error(c,e);}});
  const body=async(c:Parameters<MiddlewareHandler>[0])=>c.req.json().catch((error:unknown)=>{
    if(error instanceof Error&&error.name==='BodyLimitError')throw new V2DraftError('PAYLOAD_TOO_LARGE','Loading command exceeds 32 KiB.',413);
    throw new V2DraftError('VALIDATION_ERROR','JSON body required.',400);
  });
  router.post(base,async c=>{try{
    const result=await (await deps.service()).open(c.get('member'),await body(c),c.req.header('Idempotency-Key'));
    return c.json(result,result.meta.idempotentReplay?200:201);
  }catch(e){return v2Error(c,e);}});
  for(const [suffix,action] of [['observation-selections','select'],['close','close']] as const)router.post(`${base}/:sessionId/${suffix}`,async c=>{try{
    return c.json(await (await deps.service()).change(c.get('member'),c.req.param('sessionId'),action,await body(c),c.req.header('Idempotency-Key')));
  }catch(e){return v2Error(c,e);}});
  router.post(`${base}/:sessionId/passports`,async c=>{try{
    const result=await (await deps.service()).createPassport(c.get('member'),c.req.param('sessionId'),await body(c),c.req.header('Idempotency-Key'));
    return c.json(result,result.meta.idempotentReplay?200:201);
  }catch(e){return v2Error(c,e);}});
  router.get(`${base}/:sessionId/passports`,async c=>{try{return c.json(await (await deps.service()).listPassports(c.get('member'),c.req.param('sessionId')));}catch(e){return v2Error(c,e);}});
  router.get(`${base}/:sessionId/passports/:passportId`,async c=>{try{return c.json(await (await deps.service()).readPassport(c.get('member'),c.req.param('sessionId'),c.req.param('passportId')));}catch(e){return v2Error(c,e);}});
  const explanations = async () => {
    if (deps.explanations) return deps.explanations();
    const [{passportExplanationDependencies}, {PassportExplanationService}] = await Promise.all([
      import('@/server/modules/loading-sessions/passport-explanation-repository'),
      import('@/server/modules/loading-sessions/passport-explanation-service'),
    ]);
    return new PassportExplanationService(await passportExplanationDependencies());
  };
  router.get(`${base}/:sessionId/passports/:passportId/explanations`, async c => {try {
    return c.json(await (await explanations()).list(c.get('member'), {sessionId:c.req.param('sessionId'),passportId:c.req.param('passportId')}));
  } catch(e) {return v2Error(c,e);}});
  router.post(`${base}/:sessionId/passports/:passportId/explanations`, async c => {try {
    return c.json(await (await explanations()).generate(c.get('member'), {sessionId:c.req.param('sessionId'),passportId:c.req.param('passportId')}, await body(c), c.req.header('Idempotency-Key')));
  } catch(e) {return v2Error(c,e);}});
  router.get(`${base}/:sessionId/passports/:passportId/explanation-input`,async c=>{try{
    const query=z.object({groupId:z.string().uuid()}).strict().parse(c.req.query());
    return c.json(await (await deps.service()).explanationFacts(c.get('member'),c.req.param('sessionId'),c.req.param('passportId'),query.groupId));
  }catch(e){return v2Error(c,e);}});
  return router;
}
export const loadingSessionsRouter=createLoadingSessionsRouter({async service(){
  const {loadingOperationRepository}=await import('@/server/modules/loading-sessions/supabase-operation-repository');
  return new LoadingOperationService(await loadingOperationRepository());
}});
