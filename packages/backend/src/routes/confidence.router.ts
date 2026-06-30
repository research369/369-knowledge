/**
 * Confidence Engine Router
 * Computes, stores and retrieves scientific confidence scores.
 * Score = weighted composite of evidence level, source count, study types, recency, conflicts.
 */
import { Router, Request, Response } from "express";
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();

// ─── Confidence Computation ───────────────────────────────────────────────────

/**
 * Compute a confidence score for a given target.
 * Weights:
 *   - Evidence level (highest study type): 30%
 *   - Source count: 15%
 *   - Human studies: 20%
 *   - RCT count: 10%
 *   - Meta-analysis count: 10%
 *   - Recency (newest source year): 10%
 *   - Reviewer validation: 5%
 *   - Open conflicts (penalty): -10% per conflict (max -30%)
 */
function computeScore(params: {
  totalSources: number;
  humanStudies: number;
  animalStudies: number;
  inVitroStudies: number;
  rctCount: number;
  metaAnalysisCount: number;
  newestSourceYear: number | null;
  openConflicts: number;
  reviewerValidated: boolean;
}): {
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
} {
  const currentYear = new Date().getFullYear();

  // Evidence level score (based on best available study type)
  let evidenceLevelScore = 0;
  if (params.metaAnalysisCount > 0) evidenceLevelScore = 1.0;
  else if (params.rctCount > 0) evidenceLevelScore = 0.85;
  else if (params.humanStudies > 0) evidenceLevelScore = 0.65;
  else if (params.animalStudies > 0) evidenceLevelScore = 0.35;
  else if (params.inVitroStudies > 0) evidenceLevelScore = 0.15;
  else if (params.totalSources > 0) evidenceLevelScore = 0.05;

  // Source count score (logarithmic, capped at 20 sources = 1.0)
  const sourceCountScore = Math.min(Math.log10(params.totalSources + 1) / Math.log10(21), 1.0);

  // Human study score
  const humanStudyScore = Math.min(params.humanStudies / 5, 1.0);

  // Animal study score
  const animalStudyScore = Math.min(params.animalStudies / 5, 1.0);

  // In vitro score
  const inVitroScore = Math.min(params.inVitroStudies / 5, 1.0);

  // Meta-analysis score
  const metaAnalysisScore = Math.min(params.metaAnalysisCount / 2, 1.0);

  // Recency score (studies from last 5 years = 1.0, 10 years = 0.5, older = 0.1)
  let recencyScore = 0;
  if (params.newestSourceYear) {
    const age = currentYear - params.newestSourceYear;
    if (age <= 2) recencyScore = 1.0;
    else if (age <= 5) recencyScore = 0.8;
    else if (age <= 10) recencyScore = 0.5;
    else if (age <= 15) recencyScore = 0.3;
    else recencyScore = 0.1;
  }

  // Reviewer validation bonus
  const reviewerValidationScore = params.reviewerValidated ? 1.0 : 0.0;

  // Conflict penalty
  const conflictPenalty = Math.min(params.openConflicts * 0.1, 0.3);

  // Weighted composite
  const rawScore =
    evidenceLevelScore * 0.30 +
    sourceCountScore * 0.15 +
    humanStudyScore * 0.20 +
    metaAnalysisScore * 0.10 +
    (rctScore(params.rctCount)) * 0.10 +
    recencyScore * 0.10 +
    reviewerValidationScore * 0.05;

  const overallScore = Math.max(0, Math.min(1, rawScore - conflictPenalty));

  return {
    overallScore: Math.round(overallScore * 100) / 100,
    evidenceLevelScore: Math.round(evidenceLevelScore * 100) / 100,
    sourceCountScore: Math.round(sourceCountScore * 100) / 100,
    humanStudyScore: Math.round(humanStudyScore * 100) / 100,
    animalStudyScore: Math.round(animalStudyScore * 100) / 100,
    inVitroScore: Math.round(inVitroScore * 100) / 100,
    metaAnalysisScore: Math.round(metaAnalysisScore * 100) / 100,
    recencyScore: Math.round(recencyScore * 100) / 100,
    reviewerValidationScore: Math.round(reviewerValidationScore * 100) / 100,
    aiValidationScore: 0,
  };
}

function rctScore(count: number): number {
  return Math.min(count / 3, 1.0);
}

// ─── GET /confidence/:targetType/:targetId ────────────────────────────────────

router.get("/:targetType/:targetId", async (req: Request, res: Response) => {
  try {
    const { targetType, targetId } = req.params;

    const result = await db.execute(sql`
      SELECT * FROM confidence_scores
      WHERE target_id = ${targetId} AND target_type = ${targetType}
      LIMIT 1
    `);

    if ((result as any[]).length === 0) {
      return res.status(404).json({ error: "No confidence score found" });
    }

    res.json((result as any[])[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /confidence/compute/:targetType/:targetId ───────────────────────────
// Recomputes the confidence score for an entity based on its linked sources.

router.post("/compute/:targetType/:targetId", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { targetType, targetId } = req.params;

    // Fetch all sources linked to this entity
    const sourcesResult = await db.execute(sql`
      SELECT s.*
      FROM sources s
      WHERE ${targetId} = ANY(s.linked_entity_ids::text[])
        AND s.status = 'published'
    `);
    const sources = sourcesResult as any[];

    // Fetch open conflicts
    const conflictsResult = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM scientific_discussion
      WHERE target_id = ${targetId}
        AND is_conflict = true
        AND conflict_resolved = false
        AND active = true
    `);
    const openConflicts = parseInt((conflictsResult as any[])[0]?.count ?? "0");

    // Fetch reviewer validation
    const validationResult = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM decision_history
      WHERE target_id = ${targetId}
        AND decision = 'approved'
    `);
    const reviewerValidated = parseInt((validationResult as any[])[0]?.count ?? "0") > 0;

    // Aggregate source stats
    const stats = {
      totalSources: sources.length,
      humanStudies: sources.filter((s: any) => s.is_human).length,
      animalStudies: sources.filter((s: any) => s.is_animal).length,
      inVitroStudies: sources.filter((s: any) => s.is_in_vitro).length,
      rctCount: sources.filter((s: any) => s.is_rct).length,
      metaAnalysisCount: sources.filter((s: any) => s.is_meta_analysis).length,
      newestSourceYear: sources.length > 0 ? Math.max(...sources.map((s: any) => s.year ?? 0).filter((y: number) => y > 0)) : null,
      oldestSourceYear: sources.length > 0 ? Math.min(...sources.map((s: any) => s.year ?? 9999).filter((y: number) => y < 9999)) : null,
      openConflicts,
      reviewerValidated,
    };

    const scores = computeScore(stats);

    // Upsert confidence score
    const id = `cs-${targetType}-${targetId}`;
    const nextValidation = new Date();
    nextValidation.setDate(nextValidation.getDate() + 90); // recheck in 90 days

    await db.execute(sql`
      INSERT INTO confidence_scores (
        id, target_type, target_id,
        overall_score, evidence_level_score, source_count_score,
        human_study_score, animal_study_score, in_vitro_score,
        meta_analysis_score, recency_score, reviewer_validation_score, ai_validation_score,
        total_sources, human_studies, animal_studies, in_vitro_studies,
        rct_count, meta_analysis_count, open_conflicts,
        newest_source_year, oldest_source_year,
        next_validation_due, computed_at, updated_at
      ) VALUES (
        ${id}, ${targetType}, ${targetId},
        ${scores.overallScore}, ${scores.evidenceLevelScore}, ${scores.sourceCountScore},
        ${scores.humanStudyScore}, ${scores.animalStudyScore}, ${scores.inVitroScore},
        ${scores.metaAnalysisScore}, ${scores.recencyScore}, ${scores.reviewerValidationScore}, 0,
        ${stats.totalSources}, ${stats.humanStudies}, ${stats.animalStudies}, ${stats.inVitroStudies},
        ${stats.rctCount}, ${stats.metaAnalysisCount}, ${stats.openConflicts},
        ${stats.newestSourceYear}, ${stats.oldestSourceYear ?? null},
        ${nextValidation.toISOString()}, NOW(), NOW()
      )
      ON CONFLICT (target_id) DO UPDATE SET
        overall_score = EXCLUDED.overall_score,
        evidence_level_score = EXCLUDED.evidence_level_score,
        source_count_score = EXCLUDED.source_count_score,
        human_study_score = EXCLUDED.human_study_score,
        animal_study_score = EXCLUDED.animal_study_score,
        in_vitro_score = EXCLUDED.in_vitro_score,
        meta_analysis_score = EXCLUDED.meta_analysis_score,
        recency_score = EXCLUDED.recency_score,
        reviewer_validation_score = EXCLUDED.reviewer_validation_score,
        total_sources = EXCLUDED.total_sources,
        human_studies = EXCLUDED.human_studies,
        animal_studies = EXCLUDED.animal_studies,
        in_vitro_studies = EXCLUDED.in_vitro_studies,
        rct_count = EXCLUDED.rct_count,
        meta_analysis_count = EXCLUDED.meta_analysis_count,
        open_conflicts = EXCLUDED.open_conflicts,
        newest_source_year = EXCLUDED.newest_source_year,
        oldest_source_year = EXCLUDED.oldest_source_year,
        next_validation_due = EXCLUDED.next_validation_due,
        computed_at = NOW(),
        updated_at = NOW()
    `);

    res.json({
      id,
      targetType,
      targetId,
      ...scores,
      ...stats,
      computedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /confidence/top/:targetType ─────────────────────────────────────────
// Returns top-scored entities of a given type.

router.get("/top/:targetType", async (req: Request, res: Response) => {
  try {
    const { targetType } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await db.execute(sql`
      SELECT cs.*, e.canonical_name, e.slug
      FROM confidence_scores cs
      LEFT JOIN entities e ON cs.target_id = e.id
      WHERE cs.target_type = ${targetType}
      ORDER BY cs.overall_score DESC
      LIMIT ${limit}
    `);

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
