import { z } from "zod";
import { findRoadLocation, landRoutePolicy } from "@/features/v2-workspace/road-locations";
import type { RoadCalculation, RouteFailure } from "@/features/road-route-lab/contract";
import { calculateRoadRoutes } from "./road-routing";

const querySchema = z.object({ originId: z.string().max(50), destinationId: z.string().max(50),
  objective: z.enum(["FASTEST", "SHORTEST_RETURNED"]), traffic: z.enum(["TRAFFIC_UNAWARE", "TRAFFIC_AWARE_OPTIMAL"]) }).strict();

async function boundedBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("EMPTY_BODY");
  const chunks: Uint8Array[] = []; let bytes = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 512) { await reader.cancel(); throw new Error("OVERSIZE_BODY"); }
      chunks.push(chunk.value);
    }
    const data = new Uint8Array(bytes); let offset = 0;
    for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.length; }
    return JSON.parse(new TextDecoder().decode(data)) as unknown;
  } finally { reader.releaseLock(); }
}

export function createRoadRouteCalculator(config: {apiKey?: string; fetcher?: typeof fetch; now?: () => number}) {
  const pending = new Map<string, Promise<RoadCalculation>>();
  let calls: number[] = [];
  const fail = (reason: RouteFailure | "INVALID_REQUEST", status: number) =>
    ({ result: { status: "unavailable" as const, reason, alternatives: [] as [] }, status });
  return async (body: unknown): Promise<{
    result: RoadCalculation | { status: "unavailable"; reason: "INVALID_REQUEST"; alternatives: [] };
    status: number;
  }> => {
    const parsed = querySchema.safeParse(body);
    if (!parsed.success) return fail("INVALID_REQUEST", 400);
    const query = parsed.data;
    const policy = landRoutePolicy(query.originId, query.destinationId);
    if (policy === "invalid_location" || policy === "same_location") return fail("INVALID_ROUTE", 400);
    if (policy === "disconnected_networks") return { result: { status: "blocked", reason: "DISCONNECTED_NETWORKS", alternatives: [] }, status: 200 };
    if (!config.apiKey?.trim()) return fail("SERVER_KEY_MISSING", 503);
    const key = JSON.stringify(query);
    let calculation = pending.get(key);
    if (!calculation) {
      const now = (config.now ?? Date.now)();
      calls = calls.filter(time => now - time < 60_000);
      if (calls.length >= 10) return fail("RATE_LIMITED", 429);
      calls.push(now);
      calculation = calculateRoadRoutes({ ...query, origin: findRoadLocation(query.originId)!,
        destination: findRoadLocation(query.destinationId)!, apiKey: config.apiKey, fetcher: config.fetcher });
      pending.set(key, calculation);
      void calculation.finally(() => { if (pending.get(key) === calculation) pending.delete(key); });
    }
    const result = await calculation;
    return { result, status: result.status === "estimated" || result.reason === "NO_ROUTE" || result.reason === "NO_VALID_ROAD_ROUTE" ? 200 : 502 };
  };
}

/** Explicit local lab. This is not a public proxy or a commercial route authorization API. */
export function createRoadRoutingHandler(config: {
  enabled: boolean; localOrigin?: string; apiKey?: string; fetcher?: typeof fetch; now?: () => number;
}) {
  const localOrigin = config.localOrigin ?? "http://127.0.0.1:8080";
  const allowed = ["http://127.0.0.1:8080", "http://127.0.0.1:3090"].includes(localOrigin);
  const calculate = createRoadRouteCalculator(config);
  const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
  const fail = (reason: string, status: number) => json({ status: "unavailable", reason, alternatives: [] }, status);
  return async (request: Request) => {
    if (!config.enabled || !allowed || new URL(request.url).protocol !== "http:"
      || request.headers.get("host") !== new URL(localOrigin).host) return fail("NOT_AVAILABLE", 404);
    if (request.headers.get("origin") !== localOrigin) return fail("FORBIDDEN", 403);
    if (request.method !== "POST") return fail("INVALID_REQUEST", 405);
    if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") return fail("INVALID_REQUEST", 400);
    let body: unknown;
    try { body = await boundedBody(request); } catch { return fail("INVALID_REQUEST", 400); }
    const {result, status} = await calculate(body);
    return json(result, status);
  };
}
