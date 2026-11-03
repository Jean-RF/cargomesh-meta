import 'server-only';
import {headers} from 'next/headers';

export function localCarrierPreviewAllowed(config:{enabled:boolean;nodeEnv:string|undefined;host:string|null}){
 return config.enabled&&config.nodeEnv==='development'&&['localhost:3000','127.0.0.1:3000'].includes(config.host??'');
}

/** Frontend workspace only; API authentication and carrier permissions remain unchanged. */
export async function localCarrierPreviewEnabled(){
 return localCarrierPreviewAllowed({enabled:process.env.CARGOMESH_LOCAL_CARRIER_PREVIEW==='true',nodeEnv:process.env.NODE_ENV,host:(await headers()).get('host')});
}
