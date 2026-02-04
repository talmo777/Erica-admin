import type { VercelRequest, VercelResponse } from "@vercel/node";

const BOARD_API_BASE_URL = (process.env.BOARD_API_BASE_URL ?? "").replace(/\/+$/, "");
const ADMIN_TOKEN_AI = (process.env.ADMIN_TOKEN_AI ?? "").trim();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 간단 preflight (같은 origin이라도 브라우저가 OPTIONS 날릴 수 있음)
  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  if (!BOARD_API_BASE_URL) {
    return res.status(500).json({ ok: false, error: "BOARD_API_BASE_URL missing" });
  }
  if (!ADMIN_TOKEN_AI) {
    return res.status(500).json({ ok: false, error: "ADMIN_TOKEN_AI missing" });
  }

  try {
    const upstream = await fetch(`${BOARD_API_BASE_URL}/api/v1/ai/extract`, {
      method: "POST",
      headers: {
        // multipart boundary 유지 위해 원본 content-type 그대로 전달
        "content-type": String(req.headers["content-type"] ?? ""),
        "x-admin-token": ADMIN_TOKEN_AI,
      },
      body: req as any, // stream pass-through
    });

    // content-type 정도만 전달
    const ct = upstream.headers.get("content-type");
    if (ct) res.setHeader("content-type", ct);

    const buf = Buffer.from(await upstream.arrayBuffer());
    return res.status(upstream.status).send(buf);
  } catch (e: any) {
    console.error("admin proxy /api/ai/extract error:", e?.message);
    return res.status(500).json({ ok: false, error: "Proxy failed" });
  }
}
