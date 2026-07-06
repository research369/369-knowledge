/**
 * factory.router.ts
 *
 * Phase 5 — Knowledge Factory (v1.1 — Idempotent)
 *
 * Workflow:
 *   POST /api/factory/generate          → Neue Entity + Blocks + Relations + Agent-Felder
 *   POST /api/factory/generate-for/:id  → Bestehende Entity befüllen (IDEMPOTENT)
 *   GET  /api/factory/queue             → Review-Queue (alle pending Entities)
 *   POST /api/factory/approve/:id       → Entity genehmigen (→ approved)
 *   POST /api/factory/publish/:id       → Entity veröffentlichen (→ published + Webhooks)
 *   GET  /api/factory/status            → Factory-Statistiken
 *
 * Idempotenz-Garantien (v1.1):
 *   - generate-for/:id: Kein Duplikat-Block wenn block_type+entity_id bereits existiert
 *   - generate-for/:id: Kein Duplikat-Relation wenn from+to+type bereits existiert
 *   - generate: Slug-Konflikt → 409 mit Hinweis auf generate-for
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

// ─── Strukturiertes Logging ───────────────────────────────────────────────────
interface FactoryRunLog {
  runId: string;
  entityName: string;
  entityId: string;
  startedAt: Date;
  finishedAt?: Date;
  durationMs?: number;
  blocksCreated: number;
  blocksSkipped: number;
  relationsCreated: number;
  relationsSkipped: number;
  sourcesCreated: number;
  errors: string[];
  warnings: string[];
}

function createRunLog(entityName: string, entityId: string): FactoryRunLog {
  return {
    runId: uuidv4().slice(0, 8),
    entityName,
    entityId,
    startedAt: new Date(),
    blocksCreated: 0,
    blocksSkipped: 0,
    relationsCreated: 0,
    relationsSkipped: 0,
    sourcesCreated: 0,
    errors: [],
    warnings: [],
  };
}

function finalizeLog(log: FactoryRunLog): FactoryRunLog {
  log.finishedAt = new Date();
  log.durationMs = log.finishedAt.getTime() - log.startedAt.getTime();
  console.log(`[factory:${log.runId}] ─────────────────────────────────────`);
  console.log(`[factory:${log.runId}] Entity:    ${log.entityName} (${log.entityId})`);
  console.log(`[factory:${log.runId}] Blocks:    ${log.blocksCreated} created, ${log.blocksSkipped} skipped`);
  console.log(`[factory:${log.runId}] Relations: ${log.relationsCreated} created, ${log.relationsSkipped} skipped`);
  console.log(`[factory:${log.runId}] Sources:   ${log.sourcesCreated} created`);
  console.log(`[factory:${log.runId}] Duration:  ${log.durationMs}ms`);
  if (log.warnings.length > 0) console.log(`[factory:${log.runId}] Warnings:  ${log.warnings.join("; ")}`);
  if (log.errors.length > 0) console.log(`[factory:${log.runId}] Errors:    ${log.errors.join("; ")}`);
  console.log(`[factory:${log.runId}] ─────────────────────────────────────`);
  return log;
}

// ─── Gültige Enum-Werte ───────────────────────────────────────────────────────
const VALID_RELATION_TYPES = new Set([
  "activates","inhibits","upregulates","downregulates","binds_to","influences",
  "interacts_with","regulates","modulates","is_part_of","belongs_to","is_subtype_of",
  "contains","relevant_for","treats","improves","worsens","studied_in","evidenced_by",
  "contradicts","confirms","updates","combined_with","synergizes_with","antagonizes",
  "requires","recommends","occurs_in","expressed_in","codes_for","measured_by",
  "marker_for","answers","has_source","has_evidence","has_product","has_protocol",
  "has_stack","has_guide","part_of_academy","available_in_shop","related_topic","suggested_next"
]);

const VALID_STUDY_TYPES = new Set([
  "human","animal","in_vitro","rct","meta_analysis","review","case_study","observational"
]);

const VALID_EVIDENCE_LEVELS = new Set([
  "preclinical","in_vitro","animal","pilot_human","clinical","rct","review","meta_analysis","anecdotal"
]);

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
Nutze NUR diese exakten validen Typen (keine anderen!):
activates, inhibits, upregulates, downregulates, binds_to, influences, interacts_with, regulates, modulates,
is_part_of, belongs_to, is_subtype_of, contains, relevant_for, treats, improves, worsens, studied_in,
evidenced_by, contradicts, confirms, updates, combined_with, synergizes_with, antagonizes, requires,
recommends, occurs_in, expressed_in, codes_for, measured_by, marker_for, answers, has_source,
has_evidence, has_product, has_protocol, has_stack, has_guide, part_of_academy, available_in_shop,
related_topic, suggested_next

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
      "evidenceLevel": "clinical",
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
  if (!raw) throw new Error("LLM hat keinen Inhalt generiert — bitte erneut versuchen");

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`LLM-Antwort ist kein valides JSON: ${(e as Error).message}`);
  }

  return {
    entity: parsed.entity ?? {},
    blocks: parsed.blocks ?? [],
    relations: parsed.relations ?? [],
    agentFields: parsed.agentFields ?? {},
    sources: parsed.sources ?? [],
  };
}

// ─── Idempotenz-Hilfsfunktionen ───────────────────────────────────────────────

/**
 * Prüft ob ein Content Block mit diesem blockType+entityId bereits existiert.
 * Gibt die existierende Block-ID zurück oder null.
 */
async function findExistingBlock(entityId: string, blockType: string): Promise<string | null> {
  const existing = await db
    .select({ id: contentBlocks.id })
    .from(contentBlocks)
    .where(and(
      eq(contentBlocks.entityId, entityId),
      eq(contentBlocks.blockType, blockType)
    ))
    .limit(1);
  return existing.length > 0 ? existing[0].id : null;
}

/**
 * Prüft ob eine Relation mit from+to+type bereits existiert.
 */
async function findExistingRelation(fromEntityId: string, toEntityId: string, relationType: string): Promise<boolean> {
  const existing = await db
    .select({ id: relations.id })
    .from(relations)
    .where(and(
      eq(relations.fromEntityId, fromEntityId),
      eq(relations.toEntityId, toEntityId),
      eq(relations.relationType, relationType as any)
    ))
    .limit(1);
  return existing.length > 0;
}

/**
 * Prüft ob eine Quelle mit dieser PMID bereits global existiert.
 * Gibt { id, linkedEntityIds } zurück oder null.
 */
async function findExistingSourceByPmid(pmid: string | undefined): Promise<{ id: string; linkedEntityIds: string[] } | null> {
  if (!pmid) return null;
  const existing = await db
    .select({ id: sources.id, linkedEntityIds: sources.linkedEntityIds })
    .from(sources)
    .where(eq(sources.pmid, pmid))
    .limit(1);
  if (existing.length === 0) return null;
  return { id: existing[0].id, linkedEntityIds: (existing[0].linkedEntityIds as string[]) ?? [] };
}

/**
 * Prüft ob eine Quelle mit dieser PMID bereits für diese Entity existiert.
 */
async function findExistingSource(entityId: string, pmid: string | undefined): Promise<boolean> {
  const existing = await findExistingSourceByPmid(pmid);
  if (!existing) return false;
  return existing.linkedEntityIds.includes(entityId);
}

// ─── POST /api/factory/generate ──────────────────────────────────────────────
// Erstellt eine neue Entity vollständig aus dem Nichts
router.post("/generate", requireAdmin, async (req: Request, res: Response) => {
  const { name, type = "compound", context, existingSources } = req.body;
  if (!name) {
    return res.status(400).json({
      error: "Pflichtfeld fehlt: 'name' ist erforderlich",
      example: { name: "Epithalon", type: "compound" }
    });
  }

  const log = createRunLog(name, "new");
  console.log(`[factory:${log.runId}] 🚀 START generate: ${name} (${type})`);

  try {
    // 1. LLM generiert alles
    const generated = await generateGoldstandardEntity(name, type, context, existingSources);

    // 2. Slug bestimmen und Duplikat-Check
    const slug = generated.entity.slug || name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const existing = await db.select({ id: entities.id }).from(entities)
      .where(eq(entities.slug, slug)).limit(1);

    if (existing.length > 0) {
      return res.status(409).json({
        error: `Entity mit Slug "${slug}" existiert bereits`,
        existingId: existing[0].id,
        hint: `Nutze POST /api/factory/generate-for/${existing[0].id} um die bestehende Entity zu befüllen`,
        action: "use_generate_for"
      });
    }

    // 3. Entity anlegen
    const entityId = uuidv4();
    log.entityId = entityId;

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
      lifecycleStatus: "review" as any,
      agentSalesPitch: generated.agentFields.agentSalesPitch || null,
      agentSupportFaq: generated.agentFields.agentSupportFaq || null,
      agentResearchContext: generated.agentFields.agentResearchContext || null,
      agentMedicalDisclaimer: generated.agentFields.agentMedicalDisclaimer || null,
      agentConfidenceScore: 0.5,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 4. Content Blocks einfügen (mit Idempotenz)
    const blockResults: { id: string; layer: string; blockType: string; action: "created" | "skipped" }[] = [];
    for (const b of generated.blocks) {
      const existingBlockId = await findExistingBlock(entityId, b.blockType);
      if (existingBlockId) {
        log.blocksSkipped++;
        log.warnings.push(`Block '${b.blockType}' bereits vorhanden (${existingBlockId}), übersprungen`);
        blockResults.push({ id: existingBlockId, layer: b.layer, blockType: b.blockType, action: "skipped" });
        continue;
      }
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
        lifecycleStatus: "review" as any,
        generatedByAi: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      log.blocksCreated++;
      blockResults.push({ id: blockId, layer: b.layer, blockType: b.blockType, action: "created" });
    }

    // 5. Relations einfügen (mit Idempotenz)
    const relResults: { toEntityId: string; type: string; action: "created" | "skipped" | "target_missing" | "invalid_type" }[] = [];
    for (const r of generated.relations) {
      const safeRelationType = VALID_RELATION_TYPES.has(r.relationType) ? r.relationType : "related_topic";
      if (!VALID_RELATION_TYPES.has(r.relationType)) {
        log.warnings.push(`Relation-Typ '${r.relationType}' ungültig → auf 'related_topic' gemappt`);
      }

      const targetExists = await db.select({ id: entities.id }).from(entities)
        .where(eq(entities.id, r.toEntityId)).limit(1);

      if (targetExists.length === 0) {
        log.relationsSkipped++;
        relResults.push({ toEntityId: r.toEntityId, type: r.relationType, action: "target_missing" });
        continue;
      }

      const alreadyExists = await findExistingRelation(entityId, r.toEntityId, safeRelationType);
      if (alreadyExists) {
        log.relationsSkipped++;
        relResults.push({ toEntityId: r.toEntityId, type: safeRelationType, action: "skipped" });
        continue;
      }

      await db.insert(relations).values({
        id: uuidv4(),
        fromEntityId: entityId,
        toEntityId: r.toEntityId,
        relationType: safeRelationType as any,
        confidenceScore: r.strength || 0.7,
        description: r.description || "",
      });
      log.relationsCreated++;
      relResults.push({ toEntityId: r.toEntityId, type: safeRelationType, action: "created" });
    }

    // 6. Quellen einfügen (mit globalem PMID-Idempotenz-Check)
    const sourceResults: { id: string; pmid: string | null; action: "created" | "linked" | "skipped" }[] = [];
    for (const s of generated.sources) {
      // Globale PMID-Prüfung: existiert diese PMID bereits in der DB?
      const globalExisting = await findExistingSourceByPmid(s.pmid);
      if (globalExisting) {
        // PMID existiert bereits global
        if (globalExisting.linkedEntityIds.includes(entityId)) {
          // Bereits für diese Entity verknüpft
          log.warnings.push(`Quelle PMID:${s.pmid} bereits verknüpft, übersprungen`);
          sourceResults.push({ id: globalExisting.id, pmid: s.pmid || null, action: "skipped" });
        } else {
          // PMID existiert global, aber noch nicht für diese Entity → linkedEntityIds updaten
          const updatedLinked = [...globalExisting.linkedEntityIds, entityId];
          await db.update(sources).set({ linkedEntityIds: updatedLinked })
            .where(eq(sources.id, globalExisting.id));
          log.sourcesCreated++;
          sourceResults.push({ id: globalExisting.id, pmid: s.pmid || null, action: "linked" });
        }
        continue;
      }
      // Neue Quelle anlegen
      const sourceId = uuidv4();
      const safeStudyType = VALID_STUDY_TYPES.has(s.studyType) ? s.studyType : "review";
      const safeEvidenceLevel = VALID_EVIDENCE_LEVELS.has(s.evidenceLevel) ? s.evidenceLevel : "preclinical";
      await db.insert(sources).values({
        id: sourceId,
        title: s.title,
        authors: s.authors ? [s.authors] : [],
        journal: s.journal || undefined,
        year: s.year || undefined,
        pmid: s.pmid || undefined,
        doi: s.doi || undefined,
        studyType: safeStudyType as any,
        isHuman: s.isHuman || false,
        isRct: s.isRct || false,
        isMetaAnalysis: s.isMetaAnalysis || false,
        evidenceLevel: safeEvidenceLevel as any,
        linkedEntityIds: [entityId],
        abstract: s.summary || undefined,
      });
      log.sourcesCreated++;
      sourceResults.push({ id: sourceId, pmid: s.pmid || null, action: "created" });
    }

    finalizeLog(log);

    res.json({
      success: true,
      runId: log.runId,
      entityId,
      slug,
      status: "review",
      summary: {
        blocksCreated: log.blocksCreated,
        blocksSkipped: log.blocksSkipped,
        relationsCreated: log.relationsCreated,
        relationsSkipped: log.relationsSkipped,
        sourcesCreated: log.sourcesCreated,
        durationMs: log.durationMs,
      },
      warnings: log.warnings,
      blocks: blockResults,
      relations: relResults,
      message: `Entity "${name}" erstellt. Status: review. Nächster Schritt: POST /api/factory/approve/${entityId}`,
    });
  } catch (err: any) {
    log.errors.push(err.message);
    finalizeLog(log);
    console.error(`[factory:${log.runId}] ❌ Error:`, err.message);
    res.status(500).json({
      error: err.message,
      runId: log.runId,
      hint: "Prüfe Railway-Logs für Details"
    });
  }
});

// ─── POST /api/factory/generate-for/:id ──────────────────────────────────────
// Befüllt eine bestehende Entity (IDEMPOTENT — keine Duplikate)
router.post("/generate-for/:id", requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { context, existingSources } = req.body;

  const entityRows = await db.select().from(entities).where(eq(entities.id, id)).limit(1);
  if (entityRows.length === 0) {
    return res.status(404).json({
      error: `Entity mit ID "${id}" nicht gefunden`,
      hint: "Prüfe die ID oder nutze GET /api/entities um alle Entities aufzulisten"
    });
  }

  const e = entityRows[0];
  const log = createRunLog(e.canonicalName, id);
  console.log(`[factory:${log.runId}] 🚀 START generate-for: ${e.canonicalName} (${id})`);

  try {
    const generated = await generateGoldstandardEntity(
      e.canonicalName,
      e.type,
      context,
      existingSources
    );

    // 1. Content Blocks — IDEMPOTENT: Update wenn vorhanden, Insert wenn neu
    const blockResults: { id: string; layer: string; blockType: string; action: "created" | "updated" }[] = [];
    for (const b of generated.blocks) {
      const existingBlockId = await findExistingBlock(id, b.blockType);
      if (existingBlockId) {
        // Update statt Duplikat
        await db.update(contentBlocks).set({
          title: b.title,
          body: b.body,
          sources: b.sources || [],
          updatedAt: new Date(),
        }).where(eq(contentBlocks.id, existingBlockId));
        log.blocksSkipped++; // Als "skipped" (kein neues Insert) zählen
        blockResults.push({ id: existingBlockId, layer: b.layer, blockType: b.blockType, action: "updated" });
      } else {
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
          lifecycleStatus: "review" as any,
          generatedByAi: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        log.blocksCreated++;
        blockResults.push({ id: blockId, layer: b.layer, blockType: b.blockType, action: "created" });
      }
    }

    // 2. Relations — IDEMPOTENT: Skip wenn bereits vorhanden
    const relResults: { toEntityId: string; type: string; action: "created" | "skipped" | "target_missing" }[] = [];
    for (const r of generated.relations) {
      const safeRelationType = VALID_RELATION_TYPES.has(r.relationType) ? r.relationType : "related_topic";
      if (!VALID_RELATION_TYPES.has(r.relationType)) {
        log.warnings.push(`Relation-Typ '${r.relationType}' ungültig → 'related_topic'`);
      }

      const targetExists = await db.select({ id: entities.id }).from(entities)
        .where(eq(entities.id, r.toEntityId)).limit(1);

      if (targetExists.length === 0) {
        log.relationsSkipped++;
        relResults.push({ toEntityId: r.toEntityId, type: r.relationType, action: "target_missing" });
        continue;
      }

      const alreadyExists = await findExistingRelation(id, r.toEntityId, safeRelationType);
      if (alreadyExists) {
        log.relationsSkipped++;
        relResults.push({ toEntityId: r.toEntityId, type: safeRelationType, action: "skipped" });
        continue;
      }

      await db.insert(relations).values({
        id: uuidv4(),
        fromEntityId: id,
        toEntityId: r.toEntityId,
        relationType: safeRelationType as any,
        confidenceScore: r.strength || 0.7,
        description: r.description || "",
      });
      log.relationsCreated++;
      relResults.push({ toEntityId: r.toEntityId, type: safeRelationType, action: "created" });
    }

    // 3. Quellen — IDEMPOTENT: globale PMID-Prüfung + linkedEntityIds Update
    const sourceResults: { id: string; pmid: string | null; action: "created" | "linked" | "skipped" }[] = [];
    for (const s of generated.sources) {
      const globalExisting = await findExistingSourceByPmid(s.pmid);
      if (globalExisting) {
        if (globalExisting.linkedEntityIds.includes(id)) {
          log.warnings.push(`Quelle PMID:${s.pmid} bereits verknüpft`);
          sourceResults.push({ id: globalExisting.id, pmid: s.pmid || null, action: "skipped" });
        } else {
          const updatedLinked = [...globalExisting.linkedEntityIds, id];
          await db.update(sources).set({ linkedEntityIds: updatedLinked })
            .where(eq(sources.id, globalExisting.id));
          log.sourcesCreated++;
          sourceResults.push({ id: globalExisting.id, pmid: s.pmid || null, action: "linked" });
        }
        continue;
      }
      const sourceId = uuidv4();
      const safeStudyType = VALID_STUDY_TYPES.has(s.studyType) ? s.studyType : "review";
      const safeEvidenceLevel = VALID_EVIDENCE_LEVELS.has(s.evidenceLevel) ? s.evidenceLevel : "preclinical";
      await db.insert(sources).values({
        id: sourceId,
        title: s.title,
        authors: s.authors ? [s.authors] : [],
        journal: s.journal || undefined,
        year: s.year || undefined,
        pmid: s.pmid || undefined,
        doi: s.doi || undefined,
        studyType: safeStudyType as any,
        isHuman: s.isHuman || false,
        isRct: s.isRct || false,
        isMetaAnalysis: s.isMetaAnalysis || false,
        evidenceLevel: safeEvidenceLevel as any,
        linkedEntityIds: [id],
        abstract: s.summary || undefined,
      });
      log.sourcesCreated++;
      sourceResults.push({ id: sourceId, pmid: s.pmid || null, action: "created" });
    }

    // 4. Entity-Felder aktualisieren (nur wenn leer)
    await db.update(entities).set({
      seoTitle: generated.entity.seoTitle || e.seoTitle,
      seoDescription: generated.entity.seoDescription || e.seoDescription,
      seoKeywords: generated.entity.seoKeywords?.length ? generated.entity.seoKeywords : e.seoKeywords,
      metrics: generated.entity.metrics?.length ? generated.entity.metrics : e.metrics,
      agentSalesPitch: generated.agentFields.agentSalesPitch || e.agentSalesPitch,
      agentSupportFaq: generated.agentFields.agentSupportFaq || e.agentSupportFaq,
      agentResearchContext: generated.agentFields.agentResearchContext || e.agentResearchContext,
      agentMedicalDisclaimer: generated.agentFields.agentMedicalDisclaimer || e.agentMedicalDisclaimer,
      generatedByAi: true,
      lifecycleStatus: e.lifecycleStatus === "published" ? "published" : "review" as any,
      updatedAt: new Date(),
    }).where(eq(entities.id, id));

    finalizeLog(log);

    res.json({
      success: true,
      runId: log.runId,
      entityId: id,
      slug: e.slug,
      status: e.lifecycleStatus === "published" ? "published" : "review",
      summary: {
        blocksCreated: log.blocksCreated,
        blocksUpdated: blockResults.filter(b => b.action === "updated").length,
        relationsCreated: log.relationsCreated,
        relationsSkipped: log.relationsSkipped,
        sourcesCreated: log.sourcesCreated,
        durationMs: log.durationMs,
      },
      warnings: log.warnings,
      blocks: blockResults,
      relations: relResults,
      message: `Entity "${e.canonicalName}" befüllt (idempotent). ${log.blocksCreated} neue Blocks, ${blockResults.filter(b => b.action === "updated").length} aktualisiert.`,
    });
  } catch (err: any) {
    log.errors.push(err.message);
    finalizeLog(log);
    console.error(`[factory:${log.runId}] ❌ Error:`, err.message);
    res.status(500).json({
      error: err.message,
      runId: log.runId,
      entityId: id,
      entityName: e.canonicalName,
    });
  }
});

// ─── GET /api/factory/queue ───────────────────────────────────────────────────
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
      .where(sql`${entities.lifecycleStatus} IN ('review', 'new', 'draft')`)
      .orderBy(entities.updatedAt);

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
          approveUrl: `/api/factory/approve/${e.id}`,
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
router.post("/approve/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reviewNote } = req.body;

    const entity = await db.select().from(entities).where(eq(entities.id, id)).limit(1);
    if (entity.length === 0) {
      return res.status(404).json({
        error: `Entity mit ID "${id}" nicht gefunden`,
        hint: "Prüfe die ID oder nutze GET /api/factory/queue"
      });
    }

    const currentStatus = entity[0].lifecycleStatus;
    if (currentStatus === "published") {
      return res.status(400).json({
        error: `Entity "${entity[0].canonicalName}" ist bereits published`,
        hint: "Published Entities können nicht erneut approved werden"
      });
    }

    await db.update(entities).set({
      lifecycleStatus: "approved" as any,
      updatedAt: new Date(),
    }).where(eq(entities.id, id));

    await db.update(contentBlocks).set({
      lifecycleStatus: "approved" as any,
      updatedAt: new Date(),
    }).where(eq(contentBlocks.entityId, id));

    console.log(`[factory] ✅ Approved: ${entity[0].canonicalName} (${id})`);

    res.json({
      success: true,
      entityId: id,
      slug: entity[0].slug,
      previousStatus: currentStatus,
      status: "approved",
      message: `Entity "${entity[0].canonicalName}" genehmigt. Bereit für Publish.`,
      nextStep: `POST /api/factory/publish/${id}`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/factory/publish/:id ───────────────────────────────────────────
router.post("/publish/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const entity = await db.select().from(entities).where(eq(entities.id, id)).limit(1);
    if (entity.length === 0) {
      return res.status(404).json({
        error: `Entity mit ID "${id}" nicht gefunden`,
        hint: "Prüfe die ID oder nutze GET /api/factory/queue"
      });
    }

    if (entity[0].lifecycleStatus !== "approved") {
      return res.status(400).json({
        error: `Entity "${entity[0].canonicalName}" muss zuerst approved sein (aktuell: ${entity[0].lifecycleStatus})`,
        hint: `POST /api/factory/approve/${id}`,
        currentStatus: entity[0].lifecycleStatus,
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
      publicUrl: `/api/compound/${e.slug}`,
      message: `Entity "${e.canonicalName}" veröffentlicht. Webhooks gefeuert.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/factory/status ──────────────────────────────────────────────────
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
      factory: "369 Knowledge Factory v1.1 (Idempotent)",
      stats: {
        totalBlocks: Number((totalBlocks as any)[0]?.count ?? 0),
        totalRelations: Number((totalRelations as any)[0]?.count ?? 0),
        totalSources: Number((totalSources as any)[0]?.count ?? 0),
        aiGeneratedEntities: Number((aiGenerated as any)[0]?.count ?? 0),
      },
      byStatus: statusCounts,
      byType: typeCounts,
      idempotencyGuarantees: [
        "generate: Slug-Konflikt → 409 mit Hinweis auf generate-for",
        "generate-for: Block mit gleichem blockType+entityId → Update statt Insert",
        "generate-for: Relation mit gleichem from+to+type → Skip",
        "generate-for: Quelle mit gleicher PMID bereits verknüpft → Skip",
      ],
      workflow: {
        step1: "POST /api/factory/generate { name, type, context }",
        step2: "GET /api/factory/queue → Prüfen",
        step3: "POST /api/factory/approve/:id { reviewNote }",
        step4: "POST /api/factory/publish/:id",
        step5: "GET /api/compound/:slug → Öffentlicher Abruf",
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
