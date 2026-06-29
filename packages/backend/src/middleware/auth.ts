import { Request, Response, NextFunction } from "express";
import { createHash } from "crypto";
import { db } from "../db/index.js";
import { apiKeys, adminSessions } from "../db/schema.js";
import { eq, and, gt } from "drizzle-orm";

// ─── API Key Auth (for external agents: BEDO, PepGPT, etc.) ──────────────────

export async function requireApiKey(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  const rawKey = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : req.headers["x-api-key"] as string;

  if (!rawKey) {
    return res.status(401).json({ error: "API key required" });
  }

  const keyHash = createHash("sha256").update(rawKey).digest("hex");

  const key = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.active, true)))
    .limit(1);

  if (key.length === 0) {
    return res.status(401).json({ error: "Invalid or inactive API key" });
  }

  if (key[0].expiresAt && key[0].expiresAt < new Date()) {
    return res.status(401).json({ error: "API key expired" });
  }

  // Update last used
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, key[0].id));

  (req as any).apiKey = key[0];
  next();
}

// ─── Admin Session Auth (for admin panel) ────────────────────────────────────

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token =
    req.cookies?.admin_token ||
    req.headers["x-admin-token"] as string;

  if (!token) {
    return res.status(401).json({ error: "Admin authentication required" });
  }

  const session = await db
    .select()
    .from(adminSessions)
    .where(
      and(
        eq(adminSessions.token, token),
        gt(adminSessions.expiresAt, new Date())
      )
    )
    .limit(1);

  if (session.length === 0) {
    return res.status(401).json({ error: "Invalid or expired admin session" });
  }

  next();
}
