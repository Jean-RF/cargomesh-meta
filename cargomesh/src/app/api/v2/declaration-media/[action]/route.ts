import { handle } from "hono/vercel";
import { createHonoApp } from "@/server/hono/app";
export const runtime = "nodejs";
export const maxDuration = 60;
const handler = handle(createHonoApp());
export const POST = handler;
export const GET = handler;
