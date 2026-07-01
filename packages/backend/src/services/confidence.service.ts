/**
 * confidence.service.ts
 *
 * Schritt 6 des Architektur-Manifests:
 * Automatische Confidence-Score-Berechnung nach Source-Insert oder Entity-Update.
 *
 * Algorithmus (gewichtete Summe, 0.0–1.0):
 *   - Evidence Level Score (30%): Höchstes Evidenz-Level der verknüpften Quellen
 *   - Source Count Score (15%): Anzahl der Quellen (logarithmisch skaliert)
 *   - Human Study Score (25%): Anteil Humanstudien
 *   - Meta-Analysis Score (15%): Vorhandensein von Meta-Analysen / RCTs
 *   - Recency Score (10%): Neuheit der Quellen (letzten 5 Jahre = max)
 *   - Reviewer Validation Score (5%): Manuell validiert
 *
 * Gesamt-Score wird auch in entity.agentConfidenceScore gespiegelt.
 */

import { db } from "../db/index.js";
import { confidenceScores, sources, entities } from "../db/schema.js";
import { eq, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

// Evidence Level → numerischer Wert
const EVIDENCE_LEVEL_WEIGHTS: Record<string, number> = {
  meta_analysis:        1.0,
  systematic_review:    0.95,
  rct:                  0.90,
  cohort_study:         0.75,
  case_control:         0.65,
  case_series:          0.55,
  expert_opinion:       0.45,
  animal_study:         0.40,
  in_vitro:             0.30,
  preclinical:          0.25,
  anecdotal:            0.10,
};

// Study Type → Kategorie
const HUMAN_STUDY_TYPES = new Set(["rct", "cohort_study", "case_control", "case_series", "systematic_review", "meta_analysis"]);
const ANIMAL_STUDY_TYPES = new Set(["animal_study"]);
const IN_VITRO_TYPES     = new Set(["in_vitro", "preclinical"]);
const META_TYPES         = new Set(["meta_analysis", "systematic_review"]);

/**
 * Berechnet und speichert den Confidence Score für eine Entity.
 * Wird nach jedem Source-Insert oder Entity-PATCH aufgerufen.
 * Fehler werden geloggt aber nicht geworfen.
 */
export async function computeConfidenceScore(entityId: string): Promise<number> {
  try {
    // Alle Quellen für diese Entity laden (über linkedEntityIds JSONB)
    const entitySources = await db
      .select()
      .from(sources)
      .where(sql`${sources.linkedEntityIds} @> ${JSON.stringify([entityId])}::jsonb`);

    if (entitySources.length === 0) {
      // Keine Quellen → Minimal-Score
      await upsertConfidenceScore(entityId, {
        overallScore: 0.1,
        evidenceLevelScore: 0.1,
        sourceCountScore: 0.0,
        humanStudyScore: 0.0,
        animalStudyScore: 0.0,
        inVitroScore: 0.0,
        metaAnalysisScore: 0.0,
        recencyScore: 0.0,
        reviewerValidationScore: 0.0,
        aiValidationScore: 0.0,
        totalSources: 0,
        humanStudies: 0,
        animalStudies: 0,
        inVitroStudies: 0,
        rctCount: 0,
        metaAnalysisCount: 0,
        openConflicts: 0,
        newestSourceYear: null,
        oldestSourceYear: null,
      });
      return 0.1;
    }

    // Rohdaten berechnen
    const totalSources = entitySources.length;
    let humanStudies = 0;
    let animalStudies = 0;
    let inVitroStudies = 0;
    let rctCount = 0;
    let metaAnalysisCount = 0;
    let maxEvidenceWeight = 0;
    let years: number[] = [];

    for (const src of entitySources) {
      const studyType = src.studyType ?? "anecdotal";
      const evidenceLevel = src.evidenceLevel ?? "anecdotal";

      // Evidenz-Gewicht
      const weight = EVIDENCE_LEVEL_WEIGHTS[evidenceLevel] ?? 0.1;
      if (weight > maxEvidenceWeight) maxEvidenceWeight = weight;

      // Kategorien — nutze explizite Boolean-Felder aus dem Schema
      if (src.isHuman) humanStudies++;
      if (src.isAnimal) animalStudies++;
      if (src.isInVitro) inVitroStudies++;
      if (src.isRct) rctCount++;
      if (src.isMetaAnalysis) metaAnalysisCount++;

      // Publikationsjahr (Feld heißt 'year' nicht 'publishedYear')
      if (src.year) years.push(src.year);
    }

    const currentYear = new Date().getFullYear();
    const newestYear = years.length > 0 ? Math.max(...years) : null;
    const oldestYear = years.length > 0 ? Math.min(...years) : null;

    // ─── Score-Komponenten ────────────────────────────────────────────────────

    // 1. Evidence Level Score (30%) — höchstes Level der Quellen
    const evidenceLevelScore = maxEvidenceWeight;

    // 2. Source Count Score (15%) — logarithmisch: 1→0.1, 5→0.5, 10→0.75, 20→1.0
    const sourceCountScore = Math.min(1.0, Math.log10(totalSources + 1) / Math.log10(21));

    // 3. Human Study Score (25%) — Anteil Humanstudien
    const humanStudyScore = Math.min(1.0, humanStudies / Math.max(totalSources, 1));

    // 4. Animal Study Score (für Transparenz, kein eigenes Gewicht im Gesamt)
    const animalStudyScore = Math.min(1.0, animalStudies / Math.max(totalSources, 1));

    // 5. In Vitro Score (für Transparenz)
    const inVitroScore = Math.min(1.0, inVitroStudies / Math.max(totalSources, 1));

    // 6. Meta-Analysis Score (15%) — Vorhandensein von Meta-Analysen
    const metaAnalysisScore = metaAnalysisCount > 0 ? Math.min(1.0, metaAnalysisCount / 2) : 0;

    // 7. Recency Score (10%) — Neuheit: letzten 5 Jahre = 1.0, älter = linear fallend
    let recencyScore = 0;
    if (newestYear) {
      const age = currentYear - newestYear;
      recencyScore = Math.max(0, 1.0 - age / 10); // 10 Jahre = 0
    }

    // 8. Reviewer Validation Score (5%) — Manuell validiert (Placeholder)
    const reviewerValidationScore = 0; // Wird durch manuellen Review gesetzt

    // ─── Gesamt-Score (gewichtete Summe) ─────────────────────────────────────
    const overallScore = Math.min(1.0,
      evidenceLevelScore   * 0.30 +
      sourceCountScore     * 0.15 +
      humanStudyScore      * 0.25 +
      metaAnalysisScore    * 0.15 +
      recencyScore         * 0.10 +
      reviewerValidationScore * 0.05
    );

    // ─── Speichern ────────────────────────────────────────────────────────────
    await upsertConfidenceScore(entityId, {
      overallScore: Math.round(overallScore * 100) / 100,
      evidenceLevelScore: Math.round(evidenceLevelScore * 100) / 100,
      sourceCountScore: Math.round(sourceCountScore * 100) / 100,
      humanStudyScore: Math.round(humanStudyScore * 100) / 100,
      animalStudyScore: Math.round(animalStudyScore * 100) / 100,
      inVitroScore: Math.round(inVitroScore * 100) / 100,
      metaAnalysisScore: Math.round(metaAnalysisScore * 100) / 100,
      recencyScore: Math.round(recencyScore * 100) / 100,
      reviewerValidationScore,
      aiValidationScore: 0,
      totalSources,
      humanStudies,
      animalStudies,
      inVitroStudies,
      rctCount,
      metaAnalysisCount,
      openConflicts: 0,
      newestSourceYear: newestYear,
      oldestSourceYear: oldestYear,
    });

    // Auch agentConfidenceScore in der Entity spiegeln
    await db
      .update(entities)
      .set({
        agentConfidenceScore: Math.round(overallScore * 100) / 100,
        updatedAt: new Date(),
      } as any)
      .where(eq(entities.id, entityId));

    console.log(`[confidence.service] ✓ Entity ${entityId} → score: ${overallScore.toFixed(2)} (${totalSources} sources)`);
    return overallScore;

  } catch (err: any) {
    console.error(`[confidence.service] Error computing score for ${entityId}:`, err?.message);
    return 0;
  }
}

/**
 * Upsert: Confidence Score anlegen oder aktualisieren.
 */
async function upsertConfidenceScore(
  entityId: string,
  data: {
    overallScore: number;
    evidenceLevelScore: number;
    sourceCountScore: number;
    humanStudyScore: number;
    animalStudyScore: number;
    inVitroScore: number;
    metaAnalysisScore: number;
    recencyScore: number;
    reviewerValidationScore: number;
    aiValidationScore: number;
    totalSources: number;
    humanStudies: number;
    animalStudies: number;
    inVitroStudies: number;
    rctCount: number;
    metaAnalysisCount: number;
    openConflicts: number;
    newestSourceYear: number | null;
    oldestSourceYear: number | null;
  }
): Promise<void> {
  const existing = await db
    .select({ id: confidenceScores.id })
    .from(confidenceScores)
    .where(eq(confidenceScores.targetId, entityId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(confidenceScores)
      .set({
        ...data,
        computedAt: new Date(),
        updatedAt: new Date(),
        computationVersion: sql`${confidenceScores.computationVersion} + 1`,
      })
      .where(eq(confidenceScores.targetId, entityId));
  } else {
    await db.insert(confidenceScores).values({
      id: uuidv4(),
      targetType: "entity",
      targetId: entityId,
      ...data,
      computedAt: new Date(),
      updatedAt: new Date(),
      computationVersion: 1,
    });
  }
}
