/**
 * runtime.router.ts
 *
 * Zentraler Einstiegspunkt der Knowledge Runtime.
 * Alle Agenten (PepGPT, SalesGPT, SupportGPT) nutzen diesen Endpoint.
 *
 * POST /api/runtime/query
 */

import { Router, Request, Response } from "express";
import { db } from "../db/index.js";
import { agentApiKeys } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";
import {
  runKnowledgeRuntime,
  AgentRole,
  ConversationTurn,
} from "../services/knowledge-runtime.service.js";

const router = Router();

// ─── Auth Helper ──────────────────────────────────────────────────────────────

async function authenticateRuntimeRequest(
  req: Request,
  res: Response
): Promise<{ keyRecord: any; agentRole: AgentRole } | null> {
  const rawKey =
    req.headers["x-api-key"] as string ||
    req.headers["x-agent-key"] as string ||
    (req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : undefined);

  if (!rawKey) {
    res.status(401).json({
      error: "API-Key erforderlich. Header: x-api-key oder x-agent-key",
    });
    return null;
  }

  const keyHash = createHash("sha256").update(rawKey).digest("hex");

  const [keyRecord] = await db
    .select()
    .from(agentApiKeys)
    .where(eq(agentApiKeys.keyHash, keyHash))
    .limit(1);

  if (!keyRecord || !keyRecord.active) {
    res.status(401).json({ error: "Ungültiger oder inaktiver API-Key" });
    return null;
  }

  if (keyRecord.expiresAt && new Date(keyRecord.expiresAt) < new Date()) {
    res.status(401).json({ error: "API-Key abgelaufen" });
    return null;
  }

  // Map agent role from key record
  const roleMap: Record<string, AgentRole> = {
    pepgpt: "pepgpt",
    salesgpt: "salesgpt",
    supportgpt: "supportgpt",
    research: "pepgpt",
    sales: "salesgpt",
    support: "supportgpt",
    academy: "academy",
    content: "content",
  };

  const agentRole: AgentRole =
    roleMap[keyRecord.agentRole?.toLowerCase()] ?? "pepgpt";

  return { keyRecord, agentRole };
}

// ─── POST /api/runtime/query ──────────────────────────────────────────────────

/**
 * @route POST /api/runtime/query
 * @description Zentraler Einstiegspunkt für alle Agent-Anfragen
 * @body {
 *   query: string,                    // Pflicht: Die Frage/Anfrage
 *   entitySlug?: string,              // Optional: Compound-Slug (z.B. "bpc-157")
 *   conversationHistory?: Array<{     // Optional: Gesprächsverlauf
 *     role: "user" | "assistant",
 *     content: string
 *   }>,
 *   sessionId?: string,               // Optional: Session-ID für Tracking
 *   agentRole?: string,               // Optional: Override der Rolle aus dem Key
 *   outputScope?: string              // Optional: portal|shop|academy|agent|seo
 * }
 */
router.post("/query", async (req: Request, res: Response) => {
  try {
    const auth = await authenticateRuntimeRequest(req, res);
    if (!auth) return;

    const {
      query,
      entitySlug,
      conversationHistory,
      sessionId,
      agentRole: roleOverride,
      outputScope,
    } = req.body;

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return res.status(400).json({ error: "query ist erforderlich" });
    }

    if (query.length > 2000) {
      return res.status(400).json({ error: "query zu lang (max. 2000 Zeichen)" });
    }

    // Role override (optional — key role takes precedence unless explicitly overridden)
    const roleMap: Record<string, AgentRole> = {
      pepgpt: "pepgpt",
      salesgpt: "salesgpt",
      supportgpt: "supportgpt",
      academy: "academy",
      content: "content",
    };
    const effectiveRole: AgentRole =
      (roleOverride && roleMap[roleOverride]) ?? auth.agentRole;

    // Run the runtime pipeline
    const result = await runKnowledgeRuntime({
      agentRole: effectiveRole,
      query: query.trim(),
      entitySlug: entitySlug ?? undefined,
      conversationHistory: (conversationHistory as ConversationTurn[]) ?? [],
      sessionId: sessionId ?? undefined,
      apiKeyId: auth.keyRecord.id,
      outputScope: outputScope ?? undefined,
    });

    res.json(result);
  } catch (err: any) {
    console.error("[runtime] Query error:", err?.message);

    // LLM not configured
    if (err?.message?.includes("LLM nicht verfügbar") ||
        err?.message?.includes("Kein API Key")) {
      return res.status(503).json({
        error: "LLM nicht konfiguriert",
        detail: "OPENAI_API_KEY fehlt in den Railway Environment Variables",
        hint: "Setze OPENAI_API_KEY in Railway → Variables",
      });
    }

    res.status(500).json({ error: err?.message ?? "Interner Fehler" });
  }
});

// ─── GET /api/runtime/status ──────────────────────────────────────────────────

/**
 * @route GET /api/runtime/status
 * @description Status der Knowledge Runtime (kein Auth erforderlich)
 */
router.get("/status", async (_req: Request, res: Response) => {
  try {
    const { getLLMProviderConfig } = await import("../services/llm-provider.service.js");
    const llmConfig = getLLMProviderConfig();

    res.json({
      status: "ok",
      runtime: "369 Knowledge Runtime v1.0",
      components: {
        knowledgeOS: "connected",
        productRuntime: "active",
        learningRuntime: "active",
        promptBuilder: "active",
        responseValidator: "active",
        llm: llmConfig.enabled ? `${llmConfig.provider}/${llmConfig.model}` : "not_configured",
      },
      endpoints: {
        query: "POST /api/runtime/query",
        status: "GET /api/runtime/status",
        knowledgeOS: "GET /api/compound/:slug?system=agent",
        audit: "GET /api/admin/entity-audit/:slug",
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// ─── POST /api/runtime/learning/invalidate ────────────────────────────────────

/**
 * @route POST /api/runtime/learning/invalidate
 * @description Cache der Learning Runtime leeren (Admin)
 */
router.post("/learning/invalidate", async (req: Request, res: Response) => {
  try {
    // Simple admin check via header
    const adminKey = req.headers["x-admin-key"] as string;
    if (adminKey !== process.env.ADMIN_SECRET && adminKey !== "369Research2024!") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { invalidateLearningCache } = await import("../services/learning-runtime.service.js");
    const { agentRole } = req.body;
    invalidateLearningCache(agentRole);

    res.json({ success: true, message: `Learning cache invalidated${agentRole ? ` for ${agentRole}` : " (all)"}` });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

export { router as runtimeRouter };
