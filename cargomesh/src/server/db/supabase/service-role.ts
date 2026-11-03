import "server-only";
import {createClient} from "@supabase/supabase-js";
import {V2DraftError} from "@/server/modules/freight-requests/application/draft-service";

/**
 * Cliente privilegiado de Supabase. Solo existe en el servidor y solo se usa después de autorizar al miembro
 * con su propio cliente o de verificar la firma del worker; nunca reemplaza esas comprobaciones.
 * La clave vive en SUPABASE_SERVICE_ROLE_KEY, sin prefijo NEXT_PUBLIC_.
 */
export function createServiceRoleSupabaseClient(env: Record<string, string | undefined> = process.env) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || key.startsWith("replace-with")) {
    throw new V2DraftError("NOT_CONFIGURED", "The server-side Supabase credential is not configured.", 503);
  }
  return createClient(url, key, {auth: {persistSession: false, autoRefreshToken: false, detectSessionInUrl: false}});
}
