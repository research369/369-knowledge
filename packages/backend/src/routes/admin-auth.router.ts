import { Router, Request, Response } from "express";
import { db } from "../db/index.js";
import { adminSessions, apiKeys } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { createHash, randomBytes } from "crypto";
import { requireAdmin } from "../middleware/auth.js";
import { z } from "zod";
import { seedOntology } from "../db/seed-ontology.js";

const router = Router();

// ─── Admin Login ──────────────────────────────────────────────────────────────

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return res.status(500).json({ error: "Admin password not configured" });
    }

    if (password !== adminPassword) {
      return res.status(401).json({ error: "Invalid password" });
    }

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await db.insert(adminSessions).values({
      id: uuidv4(),
      token,
      expiresAt,
    });

    res
      .cookie("admin_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        expires: expiresAt,
      })
      .json({ message: "Logged in", expiresAt });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Admin Logout ─────────────────────────────────────────────────────────────

router.post("/logout", requireAdmin, async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.admin_token || req.headers["x-admin-token"];
    if (token) {
      await db.delete(adminSessions).where(eq(adminSessions.token, token as string));
    }
    res.clearCookie("admin_token").json({ message: "Logged out" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Admin: Create API Key (for BEDO, PepGPT, agents) ────────────────────────

const createKeySchema = z.object({
  name: z.string().min(1),
  permissions: z.array(z.string()).optional().default(["read", "write"]),
  expiresInDays: z.number().optional(),
});

router.post("/api-keys", requireAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = createKeySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const rawKey = `sk-369k-${randomBytes(24).toString("hex")}`;
    const keyHash = createHash("sha256").update(rawKey).digest("hex");

    const expiresAt = parsed.data.expiresInDays
      ? new Date(Date.now() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000)
      : undefined;

    const key = await db
      .insert(apiKeys)
      .values({
        id: uuidv4(),
        name: parsed.data.name,
        keyHash,
        permissions: parsed.data.permissions,
        active: true,
        expiresAt,
      })
      .returning();

    // Return the raw key ONCE — it cannot be retrieved again
    res.status(201).json({
      id: key[0].id,
      name: key[0].name,
      key: rawKey,
      permissions: key[0].permissions,
      expiresAt: key[0].expiresAt,
      warning: "Store this key securely. It will not be shown again.",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Admin: List API Keys (without raw keys) ─────────────────────────────────

router.get("/api-keys", requireAdmin, async (req: Request, res: Response) => {
  try {
    const keys = await db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        permissions: apiKeys.permissions,
        active: apiKeys.active,
        lastUsedAt: apiKeys.lastUsedAt,
        createdAt: apiKeys.createdAt,
        expiresAt: apiKeys.expiresAt,
      })
      .from(apiKeys);
    res.json({ data: keys });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Admin: Revoke API Key ────────────────────────────────────────────────────

router.delete("/api-keys/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    await db
      .update(apiKeys)
      .set({ active: false })
      .where(eq(apiKeys.id, req.params.id));
    res.json({ message: "API key revoked" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Admin: Run SQL Migration (ALTER TYPE for new enum values) ──────────────

router.post("/run-migration", requireAdmin, async (_req: Request, res: Response) => {
  try {
    // Add Coach Intelligence Layer relation types to PostgreSQL enum
    const newValues = [
      "alternative_to", "recommended_for", "avoid_with", "works_best_when",
      "stack_component_of", "goal_supports", "mechanism_overlap", "mechanism_complement",
      "tissue_target", "organ_target", "injury_type", "recovery_stage",
      "next_best_option", "upgrade_path", "downgrade_path", "replacement_for",
      "common_combination",
    ];
    const results: string[] = [];
    for (const val of newValues) {
      try {
        await db.execute({ sql: `ALTER TYPE relation_type ADD VALUE IF NOT EXISTS '${val}'`, params: [] } as any);
        results.push(`OK: ${val}`);
      } catch (e: any) {
        results.push(`SKIP: ${val} (${(e.message || "").slice(0, 60)})`);
      }
    }
    res.json({ message: "Migration complete", results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Admin: Re-seed Ontology (one-time fix, idempotent) ─────────────────────

router.post("/reseed-ontology", requireAdmin, async (_req: Request, res: Response) => {
  try {
    await seedOntology();
    res.json({ message: "Ontology re-seeded successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export { router as adminAuthRouter };
