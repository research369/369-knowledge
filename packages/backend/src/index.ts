import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import { db } from "./db/index.js";
import { sql } from "drizzle-orm";

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
      version: "2.0.0",
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

app.listen(PORT, () => {
  console.log(`369 Knowledge API running on http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
});

export default app;
