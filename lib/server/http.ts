/** Small helpers shared by the route handlers. */

export function json(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

export function methodNotAllowed(allow: string): Response {
  return json({ error: "Method not allowed.", code: "method_not_allowed" }, 405, {
    Allow: allow,
  });
}

/**
 * The visitor IP as seen by Vercel's edge (x-real-ip, then the first
 * x-forwarded-for hop). Only ever used hashed.
 */
export function clientIp(req: Request): string {
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || "unknown";
}

export type BodyResult =
  | { ok: true; value: unknown }
  | { ok: false; status: 400 | 413 | 415; code: string; error: string };

/**
 * Reads a JSON body with a hard byte cap, without trusting Content-Length
 * (chunked bodies have none). Stops reading as soon as the cap is passed.
 */
export async function readJsonBody(req: Request, maxBytes: number): Promise<BodyResult> {
  const type = req.headers.get("content-type") ?? "";
  if (!/^application\/json\b/i.test(type)) {
    return { ok: false, status: 415, code: "unsupported_media_type", error: "Send the request as JSON." };
  }
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > maxBytes) {
    return { ok: false, status: 413, code: "body_too_large", error: "The request is too large." };
  }
  if (!req.body) {
    return { ok: false, status: 400, code: "invalid_json", error: "Invalid request." };
  }

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel().catch(() => {});
      return { ok: false, status: 413, code: "body_too_large", error: "The request is too large." };
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.byteLength;
  }
  try {
    return { ok: true, value: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch {
    return { ok: false, status: 400, code: "invalid_json", error: "Invalid request." };
  }
}

/** Rejects a promise after `ms` with an Error named "TimeoutError". */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(`Timed out after ${ms} ms`);
      err.name = "TimeoutError";
      reject(err);
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
