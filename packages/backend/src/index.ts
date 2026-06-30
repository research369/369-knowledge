import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import { db } from "./db/index.js";
import { sql } from "drizzle-orm";
import { runPhase2bMigration } from "./db/migrate-phase2b-auto.js";
import { runGoldstandardMigration } from "./db/migrate-goldstandard-auto.js";
import { runBpc157SeedMigration } from "./db/migrate-bpc157-seed.js";
import { runTb500Seed } from "./db/migrate-tb500-seed.js";
import { runPhase3BaseEntities } from "./db/migrate-phase3-base-entities.js";
import { runGhkCuSeed } from "./db/migrate-ghkcu-seed.js";
import { runSs31Seed } from "./db/migrate-ss31-seed.js";
import { runAllMigrations } from "./db/migration-runner.js";

import { entitiesRouter } from "./routes/entities.router.js";
import { relationsRouter } from "./routes/relations.router.js";
import { contentBlocksRouter } from "./routes/content-blocks.router.js";
import { adminAuthRouter } from "./routes/admin-auth.router.js";
import { sitemapRouter } from "./routes/sitemap.router.js";
import { topicsRouter } from "./routes/topics.router.js";
import { searchRouter } from "./routes/search.router.js";
import { studiesRouter } from "./routes/studies.router.js";
import { protocolsRouter } from "./routes/protocols.router.js";
import { collectionsRouter } from "./routes/collections.router.js";
import sourcesRouter from "./routes/sources.router.js";
import promptsRouter from "./routes/prompts.router.js";
import agentsRouter from "./routes/agents.router.js";
import confidenceRouter from "./routes/confidence.router.js";
import discussionRouter from "./routes/discussion.router.js";
import tasksRouter from "./routes/tasks.router.js";

const app = express();
const PORT = process.env.PORT || 4001;

// ─── Security ─────────────────────────────────────────────────────────────────

app.use(helmet({
  contentSecurityPolicy: false, // Handled by frontend
}));

const allowedOrigins = [
  process.env.FRONTEND_URL ?? "http://localhost:5174",
  "https://wissen.369research.eu",
  "https://369research.eu",
  "https://369-knowledge.netlify.app",
  "http://localhost:5173",
  "http://localhost:5174",
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

// ─── Rate Limiting ────────────────────────────────────────────────────────────

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

const generateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Max 50 AI generations per hour
  message: "Too many AI generation requests",
});

app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use("/api", apiLimiter);
app.use("/api/entities/:id/generate", generateLimiter);

// ─── Health Check ─────────────────────────────────────────────────────────────

app.get("/health", async (_req, res) => {
  try {
    await db.execute(sql`SELECT 1`);
    res.json({
      status: "ok",
      service: "369-knowledge-api",
      version: "2.1.0",
      db: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({
      status: "error",
      service: "369-knowledge-api",
      db: "disconnected",
      timestamp: new Date().toISOString(),
    });
  }
});

// ─── API Routes ───────────────────────────────────────────────────────────────

app.use("/api/entities", entitiesRouter);
app.use("/api/relations", relationsRouter);
app.use("/api/blocks", contentBlocksRouter);
app.use("/api/admin", adminAuthRouter);
app.use("/api/topics", topicsRouter);
app.use("/api/search", searchRouter);
app.use("/api/studies", studiesRouter);
app.use("/api/protocols", protocolsRouter);
app.use("/api/collections", collectionsRouter);
app.use("/api/sources", sourcesRouter);
app.use("/api/prompts", promptsRouter);
app.use("/api/agents", agentsRouter);
app.use("/api/confidence", confidenceRouter);
app.use("/api/discussion", discussionRouter);
app.use("/api/tasks", tasksRouter);
app.use("/", sitemapRouter);

// ─── 404 Handler ─────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ─── Error Handler ────────────────────────────────────────────────────────────

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

// Run migrations on startup (idempotent — safe to run multiple times)
// CRASH-SCHUTZ: runAllMigrations() wirft NIE — Server startet immer
async function startServer() {
  await runAllMigrations([
    { name: "Phase 2b",        fn: runPhase2bMigration },
    { name: "Goldstandard",    fn: runGoldstandardMigration },
    { name: "BPC-157 Seed",    fn: runBpc157SeedMigration },
    { name: "TB-500 Seed",     fn: runTb500Seed },
    { name: "Phase 3 Base Entities", fn: runPhase3BaseEntities },
    { name: "GHK-Cu Seed",          fn: runGhkCuSeed },
    { name: "SS-31 Seed",           fn: runSs31Seed },
  ]);

  app.listen(PORT, () => {
    console.log(`369 Knowledge API running on http://localhost:${PORT}`);
    console.log(`Health: http://localhost:${PORT}/health`);
  });
}

startServer();

export default app;
