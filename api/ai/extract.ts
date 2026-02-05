import type { VercelRequest, VercelResponse } from "@vercel/node";

const BOARD_API_BASE_URL = (process.env.VITE_BOARD_API_BASE_URL ?? "").replace(/\/+$/, "");
const ADMIN_TOKEN_AI = (process.env.ADMIN_TOKEN_AI ?? "").trim();

async function readBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req as any) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  if (!BOARD_API_BASE_URL) {
    return res.status(500).json({ ok: false, error: "VITE_BOARD_API_BASE_URL missing (check Preview env scope)" });
  }
  if (!ADMIN_TOKEN_AI) {
    return res.status(500).json({ ok: false, error: "ADMIN_TOKEN_AI missing (check Preview env scope)" });
  }

  const contentType = String(req.headers["content-type"] ?? "");
  if (!contentType) {
    return res.status(400).json({ ok: false, error: "Missing Content-Type" });
  }

  try {
    const bodyBuf = await readBody(req);
    const upstreamUrl = `${BOARD_API_BASE_URL}/api/v1/ai/extract`;

    const upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "content-type": contentType,   // boundary 포함
        "x-admin-token": ADMIN_TOKEN_AI,
      },
      body: bodyBuf,
    });

    const outBuf = Buffer.from(await upstream.arrayBuffer());

    const ct = upstream.headers.get("content-type");
    if (ct) res.setHeader("content-type", ct);

    // ✅ 업스트림 status/바디 그대로 전달 → 다음 에러에서 원인 바로 보임
    return res.status(upstream.status).send(outBuf);
  } catch (e: any) {
    console.error("admin proxy /api/ai/extract error:", {
      message: e?.message,
      stack: e?.stack,
      hasBoardUrl: Boolean(BOARD_API_BASE_URL),
      hasAdminToken: Boolean(ADMIN_TOKEN_AI),
    });

    return res.status(500).json({
      ok: false,
      error: "Proxy failed",
      detail: e?.message ?? String(e),
    });
  }
}
