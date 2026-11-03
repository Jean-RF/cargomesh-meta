import "server-only";
import type {AuthenticatedMemberContext} from "@/server/auth/member";
import {createServiceRoleSupabaseClient} from "@/server/db/supabase/service-role";
import {createV2ServerSupabaseClient} from "@/server/db/supabase/v2";
import {createLoadingAnalysisSessionReader, recordLoadingObservation} from "@/server/modules/loading-sessions/producer-ports";
import {LoadingOperationService} from "@/server/modules/loading-sessions/operation-service";
import {createLoadingOperationRepository, type LoadingRpcClient} from "@/server/modules/loading-sessions/supabase-operation-repository";
import {dockmindCallbackSecretFromEnv, dockmindWorkerSettingsFromEnv} from "./config";
import {createModalDispatcher} from "./modal-dispatcher";
import type {AnalysisJobDeps, ObservationSink, ServerDeps} from "./ports";
import {
  createSupabaseAnalysisJobLedger, createSupabaseAnalysisJobRepository, createSupabaseClipLedger, createSupabaseClipRepository,
  type DockMindRpcClient,
} from "./supabase-repositories";
import {createSupabaseClipStorage, type DockMindStorageClient} from "./supabase-storage";

/** Una sola instancia por petición; se crea solo si alguna operación la necesita. */
function lazy<T>(create: () => T): () => T {
  let value: T | undefined;
  return () => (value ??= create());
}

const serviceClient = lazy(() => createServiceRoleSupabaseClient());

/** `recordLoadingObservation` de Juan con el cliente de servicio, que es el único que su RPC acepta. */
function loadingObservationSink(): ObservationSink {
  return {record: (job) => recordLoadingObservation(serviceClient() as unknown as LoadingRpcClient, job)};
}

export function dockmindServerDeps(): ServerDeps {
  const db = () => serviceClient() as unknown as DockMindRpcClient;
  return {
    clipLedger: createSupabaseClipLedger(db),
    overlays: createSupabaseClipStorage(() => serviceClient() as unknown as DockMindStorageClient),
    ledger: createSupabaseAnalysisJobLedger(db),
    observations: loadingObservationSink(),
    callbackSecret: () => dockmindCallbackSecretFromEnv(),
    now: () => new Date(),
  };
}

/**
 * Dependencias de una petición autenticada. El lector de sesión de Juan y los repositorios usan el cliente del
 * usuario, así que la base autoriza cada lectura y cada comando con su membresía. El bucket privado y el worker
 * se usan después de esa autorización.
 */
export async function dockmindRequestDeps(member: AuthenticatedMemberContext): Promise<AnalysisJobDeps> {
  const user = await createV2ServerSupabaseClient();
  const actor = {userId: member.userId, memberId: member.memberId, organizationId: member.organizationId, role: member.role};
  const loading = new LoadingOperationService(createLoadingOperationRepository(user as unknown as LoadingRpcClient));
  const settings = lazy(() => dockmindWorkerSettingsFromEnv());
  return {
    sessions: createLoadingAnalysisSessionReader(loading, member),
    clips: createSupabaseClipRepository(user as unknown as DockMindRpcClient, actor),
    jobs: createSupabaseAnalysisJobRepository(user as unknown as DockMindRpcClient, actor),
    storage: createSupabaseClipStorage(() => serviceClient() as unknown as DockMindStorageClient),
    worker: lazy(() => createModalDispatcher({url: settings().workerUrl, tokenId: settings().tokenId, tokenSecret: settings().tokenSecret})),
    config: () => settings(),
    now: () => new Date(),
  };
}
