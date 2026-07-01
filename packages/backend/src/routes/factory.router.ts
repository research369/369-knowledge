/**
 * factory.router.ts
 *
 * Phase 5 — Knowledge Factory
 *
 * Der vollständige automatisierte Workflow:
 *   POST /api/factory/generate    → Neue Entity + Blocks + Relations + Agent-Felder
 *   POST /api/factory/generate-for/:id → Bestehende Entity vollständig befüllen
 *   GET  /api/factory/queue       → Review-Queue (alle pending_review Entities)
 *   POST /api/factory/approve/:id → Entity genehmigen (→ approved)
 *   POST /api/factory/publish/:id → Entity veröffentlichen (→ published + Webhooks)
 *   GET  /api/factory/status      → Factory-Statistiken
 */
import { Router, Request, Response } from "express";
import { db } from "../db/index.js";
import { entities, contentBlocks, relations, sources, confidenceScores } from "../db/schema.js";
import { eq, and, inArray, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { requireAdmin } from "../middleware/auth.js";
import { onEntityPublished } from "../services/webhook.service.js";
import { invokeLLM, getLLMProviderConfig } from "../services/llm-provider.service.js";

const router = Router();

// ─── Goldstandard System Prompt ───────────────────────────────────────────────
const FACTORY_SYSTEM_PROMPT = `Du bist der wissenschaftliche Redakteur der 369 Research Knowledge Factory.

DEINE AUFGABE:
Erstelle vollständige, evidenzbasierte Goldstandard-Entities nach dem 369 Research Qualitätsstandard.

PFLICHTREGELN:
- Alle Inhalte auf DEUTSCH
- Ausschließlich evidenzbasiert — keine Bro-Science, keine Spekulation
- IMMER "Research Use Only" Framing
- NIEMALS: Heilversprechen, medizinische Empfehlungen, Dosierungsangaben für Menschen
- NIEMALS: "heilt", "behandelt", "therapiert", "garantiert", "klinisch bewiesen für Menschen"
- Ton: wissenschaftlich präzise, verständlich — "Wir verstehen Biologie besser als der Markt"
- Quellen: Nur echte PubMed-IDs (PMID:XXXXXXXX) oder DOI — NIEMALS erfundene Quellen
- Wenn keine echte Quelle bekannt: Feld leer lassen

LAYER-DEFINITION (Pflicht für jeden Block):
- L1: Grundlagen (Definition, Geschichte, Begriffe) — öffentlich, Laien-verständlich
- L2: Biologie (Signalwege, Rezeptoren, Mechanismen) — öffentlich, wissenschaftlich
- L3: Forschung (Studien, Evidenz, Meta-Analysen) — öffentlich, Experten
- L4: Interpretation (Einordnung, Bewertung, Limitationen) — Academy

GOLDSTANDARD-STRUKTUR (8 Blöcke Pflicht):
1. L1/definition       — "Was ist [Compound]?" (2-3 Absätze)
2. L1/simple_explanation — "Einfach erklärt" (1 Absatz, Laiensprache)
3. L2/mechanisms       — Wirkmechanismen (3-5 Hauptmechanismen)
4. L2/signaling        — Signalwege und molekulare Targets
5. L3/research         — Forschungsergebnisse mit echten PMIDs
6. L3/evidence_summary — Evidenzlage-Zusammenfassung
7. L4/interpretation   — Wissenschaftliche Einordnung + Limitationen
8. L1/faq              — 5 häufige Fragen (Research Use Only Framing)

AGENT-FELDER (Pflicht):
- agent_sales_pitch: 2-3 Sätze für Verkaufskontext (RUO-konform)
- agent_support_faq: Array von {q, a} Objekten (5-6 Einträge)
- agent_research_context: Mechanismus-Zusammenfassung für Agenten
- agent_medical_disclaimer: Standard-Disclaimer (Research Use Only)

RELATIONS (Pflicht, 8-15 Stück):
Nutze nur diese validen Typen: activates, inhibits, modulates, upregulates, downregulates, 
synergizes_with, antagonizes, treats, improves, reduces, increases, causes, prevents_in_research,
part_of, component_of, biomarker_for, expressed_in, located_in, related_to, studied_in, 
associated_with, interacts_with, regulates, promotes_in_research, involved_in

WICHTIG für Relations toEntityId:
Nutze bekannte Basis-Entity-IDs aus dem Knowledge Graph:
Signalwege: pi3k-akt-signalweg, ampk-signalweg, mtor-signalweg, nf-kb-signalweg, mapk-erk-signalweg, 
            jak-stat-signalweg, tgf-beta-signalweg, wnt-signalweg, notch-signalweg, hedgehog-signalweg
Prozesse: autophagie, apoptose, zellmigration, angiogenese, kollagensynthese, mitochondriale-biogenese,
          entzuendungsreaktion, oxidativer-stress, zellproliferation, neurogenese
Krankheiten: herzinfarkt, diabetes-typ-2, adipositas, sarcopenie, neurodegenerative-erkrankungen,
             chronische-entzuendung, osteoporose, metabolisches-syndrom, bluthochdruck, leberfibrose
Proteine: vegf, aktin, kollagen, igf-1, hif-1-alpha, sod, bcl-2, p53, foxo3, nrf2
Organe: haut, herz, leber, darm, gehirn, skelettmuskel, knochenmark, niere, lunge, knochen
Rezeptoren: glp-1-rezeptor, vegfr2, androgen-rezeptor, egf-rezeptor
Biomarker: crp, il-6, hba1c, igf-1-laborwert, malondialdehyd`;

// ─── Goldstandard Generator ───────────────────────────────────────────────────
async function generateGoldstandardEntity(
  compoundName: string,
  entityType: string,
  additionalContext?: string,
  existingSources?: string[]
): Promise<{
  entity: Record<string, any>;
  blocks: Record<string, any>[];
  relations: Record<string, any>[];
  agentFields: Record<string, any>;
  sources: Record<string, any>[];
}> {
  const sourceContext = existingSources?.length
    ? `\nBekannte Quellen/PMIDs: ${existingSources.join(", ")}`
    : "";

  const userPrompt = `Erstelle eine vollständige Goldstandard-Entity für: "${compoundName}" (Typ: ${entityType})
${additionalContext ? `\nZusätzlicher Kontext: ${additionalContext}` : ""}${sourceContext}

Antworte NUR als JSON mit dieser exakten Struktur:
{
  "entity": {
    "slug": "lowercase-mit-bindestrich",
    "canonicalName": "Offizieller Name",
    "shortDescription": "1-2 Sätze, max 200 Zeichen",
    "aliases": ["Alias1", "Alias2"],
    "casNumber": "CAS-Nummer oder null",
    "molecularFormula": "Formel oder null",
    "molecularWeight": "Gewicht oder null",
    "seoTitle": "max 60 Zeichen",
    "seoDescription": "max 160 Zeichen",
    "seoKeywords": ["keyword1", "keyword2"],
    "tags": ["tag1", "tag2"],
    "categories": ["Kategorie1"],
    "metrics": [
      {"label": "Kategorie", "value": "Peptid"},
      {"label": "Forschungsstand", "value": "Präklinisch/Phase 1/Phase 2"},
      {"label": "Evidenzlevel", "value": "Tier/Human/In-vitro"},
      {"label": "Forschungsjahre", "value": "seit XXXX"}
    ]
  },
  "blocks": [
    {
      "layer": "L1",
      "scope": ["portal", "academy", "bedo"],
      "blockType": "definition",
      "title": "Was ist ${compoundName}?",
      "body": "Vollständiger Inhalt...",
      "sources": ["PMID:12345678"],
      "sortOrder": 1
    }
  ],
  "relations": [
    {
      "toEntityId": "pi3k-akt-signalweg",
      "toEntityName": "PI3K/Akt-Signalweg",
      "relationType": "activates",
      "strength": 0.85,
      "description": "Kurze Beschreibung der Relation"
    }
  ],
  "agentFields": {
    "agentSalesPitch": "2-3 Sätze für Verkaufskontext (RUO-konform)",
    "agentSupportFaq": [
      {"q": "Frage 1?", "a": "Antwort 1"},
      {"q": "Frage 2?", "a": "Antwort 2"},
      {"q": "Frage 3?", "a": "Antwort 3"},
      {"q": "Frage 4?", "a": "Antwort 4"},
      {"q": "Frage 5?", "a": "Antwort 5"}
    ],
    "agentResearchContext": "Mechanismus-Zusammenfassung für Agenten (3-5 Sätze)",
    "agentMedicalDisclaimer": "Dieses Produkt ist ausschließlich für Forschungszwecke bestimmt (Research Use Only). Es ist nicht für den menschlichen Gebrauch zugelassen. Keine medizinische Beratung."
  },
  "sources": [
    {
      "title": "Studientitel",
      "authors": "Autor et al.",
      "journal": "Journal Name",
      "year": 2023,
      "pmid": "12345678",
      "doi": "10.xxxx/xxxxx",
      "studyType": "rct",
      "isHuman": true,
      "isRct": true,
      "isMetaAnalysis": false,
      "evidenceLevel": "high",
      "summary": "Kurze Zusammenfassung der Studie"
    }
  ]
}`;

  const response = await invokeLLM(
    [
      { role: "system", content: FACTORY_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    { temperature: 0.2, maxTokens: 8000, responseFormat: "json" }
  );

  const raw = response.content;
  if (!raw) throw new Error("No content generated by LLM");

  const parsed = JSON.parse(raw);
  return {
    entity: parsed.entity ?? {},
    blocks: parsed.blocks ?? [],
    relations: parsed.relations ?? [],
    agentFields: parsed.agentFields ?? {},
    sources: parsed.sources ?? [],
  };
}

// ─── POST /api/factory/generate ──────────────────────────────────────────────
// Erstellt eine neue Entity vollständig aus dem Nichts
router.post("/generate", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, type = "compound", context, existingSources } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });

    console.log(`[factory] Generating: ${name} (${type})`);

    // 1. LLM generiert alles
    const generated = await generateGoldstandardEntity(name, type, context, existingSources);

    // 2. Entity anlegen
    const entityId = uuidv4();
    const slug = generated.entity.slug || name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    // Prüfe ob Entity mit diesem Slug schon existiert
    const existing = await db.select({ id: entities.id }).from(entities)
      .where(eq(entities.slug, slug)).limit(1);
    if (existing.length > 0) {
      return res.status(409).json({
        error: `Entity mit Slug "${slug}" existiert bereits`,
        existingId: existing[0].id,
        hint: "Nutze POST /api/factory/generate-for/:id um eine bestehende Entity zu befüllen"
      });
    }

    await db.insert(entities).values({
      id: entityId,
      slug,
      type: type as any,
      canonicalName: generated.entity.canonicalName || name,
      shortDescription: generated.entity.shortDescription || "",
      aliases: generated.entity.aliases || [],
      casNumber: generated.entity.casNumber || null,
      molecularFormula: generated.entity.molecularFormula || null,
      molecularWeight: generated.entity.molecularWeight || null,
      seoTitle: generated.entity.seoTitle || "",
      seoDescription: generated.entity.seoDescription || "",
      seoKeywords: generated.entity.seoKeywords || [],
      tags: generated.entity.tags || [],
      categories: generated.entity.categories || [],
      metrics: generated.entity.metrics || [],
      generatedByAi: true,
      lifecycleStatus: "pending_review" as any,
      agentSalesPitch: generated.agentFields.agentSalesPitch || null,
      agentSupportFaq: generated.agentFields.agentSupportFaq || null,
      agentResearchContext: generated.agentFields.agentResearchContext || null,
      agentMedicalDisclaimer: generated.agentFields.agentMedicalDisclaimer || null,
      agentConfidenceScore: 0.5, // Initial-Score, wird nach Source-Insert aktualisiert
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 3. Content Blocks einfügen
    const blockResults: { id: string; layer: string; blockType: string }[] = [];
    for (const b of generated.blocks) {
      const blockId = uuidv4();
      await db.insert(contentBlocks).values({
        id: blockId,
        entityId,
        layer: b.layer as any,
        scope: b.scope || ["portal", "academy", "bedo"],
        blockType: b.blockType,
        title: b.title,
        body: b.body,
        sources: b.sources || [],
        sortOrder: b.sortOrder || 1,
        lifecycleStatus: "pending_review" as any,
        generatedByAi: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      blockResults.push({ id: blockId, layer: b.layer, blockType: b.blockType });
    }

    // 4. Relations einfügen (nur wenn Ziel-Entity existiert)
    const relResults: { id: string; toEntityId: string; type: string; inserted: boolean }[] = [];
    for (const r of generated.relations) {
      // Prüfe ob Ziel-Entity existiert
      const targetExists = await db.select({ id: entities.id }).from(entities)
        .where(eq(entities.id, r.toEntityId)).limit(1);

      if (targetExists.length > 0) {
        const relId = uuidv4();
        await db.insert(relations).values({
          id: relId,
          fromEntityId: entityId,
          toEntityId: r.toEntityId,
          relationType: r.relationType as any,
          confidenceScore: r.strength || 0.7,
          description: r.description || "",
        });
        relResults.push({ id: relId, toEntityId: r.toEntityId, type: r.relationType, inserted: true });
      } else {
        relResults.push({ id: "", toEntityId: r.toEntityId, type: r.relationType, inserted: false });
      }
    }

    // 5. Quellen einfügen
    const sourceResults: { id: string; pmid: string | null }[] = [];
    for (const s of generated.sources) {
      const sourceId = uuidv4();
      await db.insert(sources).values({
        id: sourceId,
        title: s.title,
        authors: s.authors ? [s.authors] : [],
        journal: s.journal || undefined,
        year: s.year || undefined,
        pmid: s.pmid || undefined,
        doi: s.doi || undefined,
        studyType: (s.studyType || "review") as any,
        isHuman: s.isHuman || false,
        isRct: s.isRct || false,
        isMetaAnalysis: s.isMetaAnalysis || false,
        evidenceLevel: (s.evidenceLevel || "moderate") as any,
        linkedEntityIds: [entityId],
        abstract: s.summary || undefined,
      });
      sourceResults.push({ id: sourceId, pmid: s.pmid || null });
    }

    const insertedRels = relResults.filter(r => r.inserted).length;
    const skippedRels = relResults.filter(r => !r.inserted).length;

    console.log(`[factory] ✅ ${name}: ${blockResults.length} blocks, ${insertedRels} relations, ${sourceResults.length} sources`);

    res.json({
      success: true,
      entityId,
      slug,
      status: "pending_review",
      summary: {
        blocksCreated: blockResults.length,
        relationsInserted: insertedRels,
        relationsSkipped: skippedRels,
        sourcesCreated: sourceResults.length,
      },
      blocks: blockResults,
      relations: relResults,
      skippedRelations: relResults.filter(r => !r.inserted).map(r => r.toEntityId),
      message: `Entity "${name}" erstellt. Status: pending_review. Bitte manuell prüfen und dann /api/factory/approve/${entityId} aufrufen.`,
    });
  } catch (err: any) {
    console.error("[factory] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/factory/generate-for/:id ──────────────────────────────────────
// Befüllt eine bestehende (leere) Entity vollständig
router.post("/generate-for/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { context, existingSources } = req.body;

    const entity = await db.select().from(entities).where(eq(entities.id, id)).limit(1);
    if (entity.length === 0) return res.status(404).json({ error: "Entity not found" });

    const e = entity[0];
    console.log(`[factory] Generating for existing entity: ${e.canonicalName}`);

    const generated = await generateGoldstandardEntity(
      e.canonicalName,
      e.type,
      context,
      existingSources
    );

    // Blocks einfügen
    const blockResults: { id: string; layer: string; blockType: string }[] = [];
    for (const b of generated.blocks) {
      const blockId = uuidv4();
      await db.insert(contentBlocks).values({
        id: blockId,
        entityId: id,
        layer: b.layer as any,
        scope: b.scope || ["portal", "academy", "bedo"],
        blockType: b.blockType,
        title: b.title,
        body: b.body,
        sources: b.sources || [],
        sortOrder: b.sortOrder || 1,
        lifecycleStatus: "pending_review" as any,
        generatedByAi: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      blockResults.push({ id: blockId, layer: b.layer, blockType: b.blockType });
    }

    // Relations einfügen
    const relResults: { toEntityId: string; inserted: boolean }[] = [];
    for (const r of generated.relations) {
      const targetExists = await db.select({ id: entities.id }).from(entities)
        .where(eq(entities.id, r.toEntityId)).limit(1);
      if (targetExists.length > 0) {
        await db.insert(relations).values({
          id: uuidv4(),
          fromEntityId: id,
          toEntityId: r.toEntityId,
          relationType: r.relationType as any,
          confidenceScore: r.strength || 0.7,
          description: r.description || "",
        });
        relResults.push({ toEntityId: r.toEntityId, inserted: true });
      } else {
        relResults.push({ toEntityId: r.toEntityId, inserted: false });
      }
    }

    // Quellen einfügen
    const sourceResults: { id: string }[] = [];
    for (const s of generated.sources) {
      const sourceId = uuidv4();
      await db.insert(sources).values({
        id: sourceId,
        title: s.title,
        authors: s.authors ? [s.authors] : [],
        journal: s.journal || undefined,
        year: s.year || undefined,
        pmid: s.pmid || undefined,
        doi: s.doi || undefined,
        studyType: (s.studyType || "review") as any,
        isHuman: s.isHuman || false,
        isRct: s.isRct || false,
        isMetaAnalysis: s.isMetaAnalysis || false,
        evidenceLevel: (s.evidenceLevel || "moderate") as any,
        linkedEntityIds: [id],
        abstract: s.summary || undefined,
      });
      sourceResults.push({ id: sourceId });
    }

    // Entity-Felder aktualisieren
    await db.update(entities).set({
      seoTitle: generated.entity.seoTitle || e.seoTitle,
      seoDescription: generated.entity.seoDescription || e.seoDescription,
      seoKeywords: generated.entity.seoKeywords || e.seoKeywords,
      metrics: generated.entity.metrics || e.metrics,
      agentSalesPitch: generated.agentFields.agentSalesPitch || e.agentSalesPitch,
      agentSupportFaq: generated.agentFields.agentSupportFaq || e.agentSupportFaq,
      agentResearchContext: generated.agentFields.agentResearchContext || e.agentResearchContext,
      agentMedicalDisclaimer: generated.agentFields.agentMedicalDisclaimer || e.agentMedicalDisclaimer,
      generatedByAi: true,
      lifecycleStatus: "pending_review" as any,
      updatedAt: new Date(),
    }).where(eq(entities.id, id));

    res.json({
      success: true,
      entityId: id,
      slug: e.slug,
      status: "pending_review",
      summary: {
        blocksCreated: blockResults.length,
        relationsInserted: relResults.filter(r => r.inserted).length,
        relationsSkipped: relResults.filter(r => !r.inserted).length,
        sourcesCreated: sourceResults.length,
      },
      message: `Entity "${e.canonicalName}" befüllt. Status: pending_review.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/factory/queue ───────────────────────────────────────────────────
// Review-Queue: alle Entities die auf Prüfung warten
router.get("/queue", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const pendingEntities = await db
      .select({
        id: entities.id,
        slug: entities.slug,
        canonicalName: entities.canonicalName,
        type: entities.type,
        lifecycleStatus: entities.lifecycleStatus,
        generatedByAi: entities.generatedByAi,
        createdAt: entities.createdAt,
        updatedAt: entities.updatedAt,
      })
      .from(entities)
      .where(
        sql`${entities.lifecycleStatus} IN ('pending_review', 'new', 'draft')`
      )
      .orderBy(entities.updatedAt);

    // Für jede Entity: Block-Count und Relations-Count
    const enriched = await Promise.all(
      pendingEntities.map(async (e) => {
        const blockCount = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(contentBlocks)
          .where(eq(contentBlocks.entityId, e.id));
        const relCount = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(relations)
          .where(eq(relations.fromEntityId, e.id));
        return {
          ...e,
          blockCount: Number(blockCount[0]?.count ?? 0),
          relationCount: Number(relCount[0]?.count ?? 0),
          readyForReview: Number(blockCount[0]?.count ?? 0) >= 6,
        };
      })
    );

    res.json({
      total: enriched.length,
      readyForReview: enriched.filter(e => e.readyForReview).length,
      entities: enriched,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/factory/approve/:id ───────────────────────────────────────────
// Entity genehmigen (pending_review → approved)
router.post("/approve/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reviewNote } = req.body;

    const entity = await db.select().from(entities).where(eq(entities.id, id)).limit(1);
    if (entity.length === 0) return res.status(404).json({ error: "Entity not found" });

    await db.update(entities).set({
      lifecycleStatus: "approved" as any,
      updatedAt: new Date(),
    }).where(eq(entities.id, id));

    // Auch alle Blocks auf approved setzen
    await db.update(contentBlocks).set({
      lifecycleStatus: "approved" as any,
      updatedAt: new Date(),
    }).where(eq(contentBlocks.entityId, id));

    console.log(`[factory] ✅ Approved: ${entity[0].canonicalName} (${id})`);

    res.json({
      success: true,
      entityId: id,
      slug: entity[0].slug,
      status: "approved",
      message: `Entity "${entity[0].canonicalName}" genehmigt. Bereit für Publish.`,
      nextStep: `POST /api/factory/publish/${id}`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/factory/publish/:id ───────────────────────────────────────────
// Entity veröffentlichen (approved → published + Webhooks)
router.post("/publish/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const entity = await db.select().from(entities).where(eq(entities.id, id)).limit(1);
    if (entity.length === 0) return res.status(404).json({ error: "Entity not found" });

    if (entity[0].lifecycleStatus !== "approved") {
      return res.status(400).json({
        error: `Entity muss zuerst approved sein (aktuell: ${entity[0].lifecycleStatus})`,
        hint: `POST /api/factory/approve/${id}`
      });
    }

    await db.update(entities).set({
      lifecycleStatus: "published" as any,
      publishedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(entities.id, id));

    await db.update(contentBlocks).set({
      lifecycleStatus: "published" as any,
      updatedAt: new Date(),
    }).where(eq(contentBlocks.entityId, id));

    // Webhooks feuern
    const e = entity[0];
    await onEntityPublished({
      id,
      slug: e.slug ?? undefined,
      type: e.type,
      canonicalName: e.canonicalName,
    });

    console.log(`[factory] 🚀 Published: ${e.canonicalName} (${id})`);

    res.json({
      success: true,
      entityId: id,
      slug: e.slug,
      status: "published",
      message: `Entity "${e.canonicalName}" veröffentlicht. Webhooks gefeuert.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/factory/status ──────────────────────────────────────────────────
// Factory-Statistiken und Übersicht
router.get("/status", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const statusCounts = await db.execute(sql`
      SELECT lifecycle_status, COUNT(*) as count
      FROM entities
      GROUP BY lifecycle_status
      ORDER BY count DESC
    `);

    const typeCounts = await db.execute(sql`
      SELECT type, COUNT(*) as count
      FROM entities
      GROUP BY type
      ORDER BY count DESC
    `);

    const totalBlocks = await db.execute(sql`SELECT COUNT(*) as count FROM content_blocks`);
    const totalRelations = await db.execute(sql`SELECT COUNT(*) as count FROM relations`);
    const totalSources = await db.execute(sql`SELECT COUNT(*) as count FROM sources`);
    const aiGenerated = await db.execute(sql`SELECT COUNT(*) as count FROM entities WHERE generated_by_ai = true`);

    res.json({
      factory: "369 Knowledge Factory v1.0",
      stats: {
        totalBlocks: Number((totalBlocks as any)[0]?.count ?? 0),
        totalRelations: Number((totalRelations as any)[0]?.count ?? 0),
        totalSources: Number((totalSources as any)[0]?.count ?? 0),
        aiGeneratedEntities: Number((aiGenerated as any)[0]?.count ?? 0),
      },
      byStatus: statusCounts,
      byType: typeCounts,
      workflow: {
        step1: "POST /api/factory/generate { name, type, context }",
        step2: "GET /api/factory/queue → Prüfen",
        step3: "POST /api/factory/approve/:id { reviewNote }",
        step4: "POST /api/factory/publish/:id",
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
