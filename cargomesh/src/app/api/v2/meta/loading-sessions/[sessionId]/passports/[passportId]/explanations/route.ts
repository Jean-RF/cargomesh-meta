import { handle } from "hono/vercel";
import { createHonoApp } from "@/server/hono/app";

export const runtime = "nodejs";
export const maxDuration = 60;
const app = createHonoApp();
export const GET = handle(app);
export const POST = handle(app);
