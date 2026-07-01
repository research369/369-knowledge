import { Router, Request, Response } from "express";
import { db } from "../db/index.js";
import { sources, contentBlockSources } from "../db/schema.js";
import { eq, desc, ilike, or, and, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { computeConfidenceScore } from "../services/confidence.service.js";

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchFromPubMed(pmid: string) {
  const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${pmid}&retmode=json`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`PubMed API error: ${res.status}`);
  const data = await res.json() as any;
  const result = data?.result?.[pmid];
  if (!result) throw new Error("PMID not found");

  // Also fetch abstract
  const abstractUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pmid}&rettype=abstract&retmode=text`;
  let abstract = "";
  try {
    const absRes = await fetch(abstractUrl, { signal: AbortSignal.timeout(8000) });
    if (absRes.ok) abstract = await absRes.text();
  } catch {}

  return {
    pmid,
    title: result.title || "",
    authors: (result.authors || []).map((a: any) => a.name || ""),
    journal: result.fulljournalname || result.source || "",
    year: result.pubdate ? parseInt(result.pubdate.substring(0, 4)) : null,
    abstract: abstract.trim(),
    pubmedUrl: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
  };
}

async function fetchFromCrossRef(doi: string) {
  const encoded = encodeURIComponent(doi);
  const url = `https://api.crossref.org/works/${encoded}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "369-knowledge/1.0 (mailto:info@369research.eu)" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`CrossRef API error: ${res.status}`);
  const data = await res.json() as any;
  const msg = data?.message;
  if (!msg) throw new Error("DOI not found");

  const authors = (msg.author || []).map((a: any) =>
    [a.given, a.family].filter(Boolean).join(" ")
  );
  const year = msg.published?.["date-parts"]?.[0]?.[0] || null;
  const journal = msg["container-title"]?.[0] || "";
  const volume = msg.volume || "";
  const issue = msg.issue || "";
  const pages = msg.page || "";

  return {
    doi,
    crossrefUrl: `https://doi.org/${doi}`,
    title: (msg.title || [])[0] || "",
    authors,
    journal,
    year,
    volume,
    issue,
    pages,
    impactFactor: null,
  };
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/sources — list with pagination + filters
router.get("/", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const search = req.query.search as string;
    const status = req.query.status as string;
    const evidenceLevel = req.query.evidenceLevel as string;

    const conditions = [];
    if (search) {
      conditions.push(
        or(
          ilike(sources.title, `%${search}%`),
          ilike(sources.journal, `%${search}%`),
          ilike(sources.pmid, `%${search}%`),
          ilike(sources.doi, `%${search}%`)
        )
      );
    }
    if (status) conditions.push(eq(sources.status, status as any));
    if (evidenceLevel) conditions.push(eq(sources.evidenceLevel, evidenceLevel as any));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, countResult] = await Promise.all([
      db.select().from(sources)
        .where(where)
        .orderBy(desc(sources.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(sources).where(where),
    ]);

    res.json({ data: rows, total: countResult[0]?.count ?? 0, limit, offset });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sources/:id
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const [source] = await db.select().from(sources).where(eq(sources.id, req.params.id));
    if (!source) return res.status(404).json({ error: "Source not found" });

    // Also get linked content blocks
    const linkedBlocks = await db.select().from(contentBlockSources)
      .where(eq(contentBlockSources.sourceId, req.params.id));

    res.json({ ...source, linkedBlocks });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sources — create manually
router.post("/", async (req: Request, res: Response) => {
  try {
    const id = req.body.id || (req.body.pmid ? `pmid-${req.body.pmid}` : `doi-${req.body.doi?.replace(/[^a-z0-9]/gi, "-")}` || randomUUID());
    const [created] = await db.insert(sources).values({
      id,
      ...req.body,
    }).returning();

    // Confidence-Score automatisch neu berechnen (non-blocking)
    // linkedEntityIds ist ein JSONB-Array mit Entity-IDs
    const linkedIds = Array.isArray(created.linkedEntityIds) ? created.linkedEntityIds as string[] : [];
    for (const eid of linkedIds) {
      computeConfidenceScore(eid).catch(() => {});
    }

    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/sources/:id — update
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const [updated] = await db.update(sources)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(sources.id, req.params.id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Source not found" });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/sources/:id
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    await db.delete(sources).where(eq(sources.id, req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sources/import/pmid — auto-import from PubMed
router.post("/import/pmid", async (req: Request, res: Response) => {
  try {
    const { pmid } = req.body;
    if (!pmid) return res.status(400).json({ error: "pmid required" });

    // Check if already exists
    const [existing] = await db.select().from(sources).where(eq(sources.pmid, pmid));
    if (existing) return res.json({ source: existing, imported: false, message: "Already exists" });

    const pubmedData = await fetchFromPubMed(pmid);
    const id = `pmid-${pmid}`;

    const [created] = await db.insert(sources).values({
      id,
      pmid,
      title: pubmedData.title,
      authors: pubmedData.authors,
      journal: pubmedData.journal,
      year: pubmedData.year,
      abstract: pubmedData.abstract,
      pubmedUrl: pubmedData.pubmedUrl,
      status: "draft",
      importedAt: new Date(),
    }).returning();

    res.status(201).json({ source: created, imported: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sources/import/doi — auto-import from CrossRef
router.post("/import/doi", async (req: Request, res: Response) => {
  try {
    const { doi } = req.body;
    if (!doi) return res.status(400).json({ error: "doi required" });

    // Check if already exists
    const [existing] = await db.select().from(sources).where(eq(sources.doi, doi));
    if (existing) return res.json({ source: existing, imported: false, message: "Already exists" });

    const crossrefData = await fetchFromCrossRef(doi);
    const id = `doi-${doi.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`;

    const [created] = await db.insert(sources).values({
      id,
      doi: crossrefData.doi,
      crossrefUrl: crossrefData.crossrefUrl,
      title: crossrefData.title,
      authors: crossrefData.authors,
      journal: crossrefData.journal,
      year: crossrefData.year,
      volume: crossrefData.volume,
      issue: crossrefData.issue,
      pages: crossrefData.pages,
      status: "draft",
      importedAt: new Date(),
    }).returning();

    res.status(201).json({ source: created, imported: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sources/import/batch — batch import multiple PMIDs/DOIs
router.post("/import/batch", async (req: Request, res: Response) => {
  try {
    const { pmids = [], dois = [] } = req.body;
    const results: { id: string; success: boolean; error?: string }[] = [];

    for (const pmid of pmids) {
      try {
        const [existing] = await db.select().from(sources).where(eq(sources.pmid, pmid));
        if (existing) { results.push({ id: pmid, success: true }); continue; }
        const data = await fetchFromPubMed(pmid);
        await db.insert(sources).values({
          id: `pmid-${pmid}`,
          pmid,
          title: data.title,
          authors: data.authors,
          journal: data.journal,
          year: data.year,
          abstract: data.abstract,
          pubmedUrl: data.pubmedUrl,
          status: "draft",
          importedAt: new Date(),
        });
        results.push({ id: pmid, success: true });
      } catch (e: any) {
        results.push({ id: pmid, success: false, error: e.message });
      }
    }

    for (const doi of dois) {
      try {
        const [existing] = await db.select().from(sources).where(eq(sources.doi, doi));
        if (existing) { results.push({ id: doi, success: true }); continue; }
        const data = await fetchFromCrossRef(doi);
        await db.insert(sources).values({
          id: `doi-${doi.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`,
          doi: data.doi,
          crossrefUrl: data.crossrefUrl,
          title: data.title,
          authors: data.authors,
          journal: data.journal,
          year: data.year,
          status: "draft",
          importedAt: new Date(),
        });
        results.push({ id: doi, success: true });
      } catch (e: any) {
        results.push({ id: doi, success: false, error: e.message });
      }
    }

    res.json({ results, imported: results.filter(r => r.success).length, failed: results.filter(r => !r.success).length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
