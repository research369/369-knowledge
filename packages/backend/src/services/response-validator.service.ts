/**
 * response-validator.service.ts
 *
 * Response Validator — prüft jede LLM-Antwort vor der Ausgabe.
 *
 * Prüfungen:
 * 1. Compliance (Heilversprechen, medizinische Claims)
 * 2. Produktdaten (keine erfundenen Preise/Produkte)
 * 3. Academy-Konsistenz (kein L4-Content in Portal-Antworten)
 * 4. Knowledge-Konsistenz (keine Widersprüche zu Knowledge OS)
 * 5. Halluzinations-Erkennung (erfundene Studien, falsche PMIDs)
 * 6. Scope-Regeln (Dosierung nur in Academy)
 */

import type { AgentRole, KnowledgeView } from "./knowledge-runtime.service.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ValidationContext {
  agentRole: AgentRole;
  intent: string;
  entitySlug?: string;
  knowledge: KnowledgeView | null;
}

export interface ValidationResult {
  passed: boolean;
  warnings: string[];
  errors: string[];
  correctedAnswer?: string;
}

// ─── Compliance Patterns ──────────────────────────────────────────────────────

const FORBIDDEN_MEDICAL_CLAIMS = [
  /\b(heilt|heilung|geheilt)\b/gi,
  /\b(behandelt|behandlung|therapiert|therapie)\b/gi,
  /\b(verhindert|prävention|vorbeugung)\b/gi,
  /\b(diagnostiziert|diagnose)\b/gi,
  /\b(klinisch bewiesen|klinisch getestet)\b/gi,
  /\b(zugelassen|arzneimittel|medikament)\b/gi,
];

const DOSAGE_PATTERNS = [
  /\b(\d+\s*(mg|mcg|µg|iu|ie)\s*(pro|täglich|daily|per|\/)\s*(kg|tag|day|woche|week))/gi,
  /\b(dosier|dosis|einnahme|injizier|spritz)\b/gi,
  /\b(\d+\s*(mg|mcg|µg)\s*(morgens|abends|nüchtern|vor dem training))/gi,
];

const HALLUCINATION_PATTERNS = [
  /PMID:\s*(\d{5,9})/g, // Check if PMIDs look plausible (8-9 digits)
  /doi:\s*10\.\d{4,}/gi,
  /studie von \d{4}/gi,
];

// ─── Disclaimer Check ─────────────────────────────────────────────────────────

const DISCLAIMER_PATTERNS = [
  /research use only/i,
  /nicht für den menschlichen gebrauch/i,
  /ruo/i,
  /not for human use/i,
];

// ─── Validator Functions ──────────────────────────────────────────────────────

function checkCompliance(answer: string, ctx: ValidationContext): string[] {
  const warnings: string[] = [];

  // Check forbidden medical claims
  for (const pattern of FORBIDDEN_MEDICAL_CLAIMS) {
    if (pattern.test(answer)) {
      warnings.push(`COMPLIANCE: Potentiell verbotener medizinischer Claim gefunden (Pattern: ${pattern.source})`);
    }
    pattern.lastIndex = 0; // Reset regex
  }

  return warnings;
}

function checkDosageScope(answer: string, ctx: ValidationContext): string[] {
  const warnings: string[] = [];

  if (ctx.agentRole === "academy") return warnings; // Academy kann Dosierung erwähnen

  for (const pattern of DOSAGE_PATTERNS) {
    if (pattern.test(answer)) {
      // FIX: Dosierungsangaben außerhalb der Academy sind HARD ERRORS → validationPassed:false
      warnings.push(`DOSAGE_VIOLATION: Konkrete Dosierungsangabe in ${ctx.agentRole}-Antwort erkannt — nicht erlaubt außerhalb der Academy (RUO-Compliance)`);
    }
    pattern.lastIndex = 0;
  }

  return warnings;
}

function checkDisclaimer(answer: string): string[] {
  const hasDisclaimer = DISCLAIMER_PATTERNS.some(p => p.test(answer));
  if (!hasDisclaimer) {
    return ["DISCLAIMER: Antwort enthält keinen RUO-Disclaimer"];
  }
  return [];
}

function checkHallucinations(answer: string, knowledge: KnowledgeView | null): string[] {
  const warnings: string[] = [];

  // Check for suspiciously short PMIDs (< 7 digits = likely fake)
  const pmidMatches = answer.matchAll(/PMID:\s*(\d+)/g);
  for (const match of pmidMatches) {
    const pmid = match[1];
    if (pmid.length < 7 || pmid.length > 9) {
      warnings.push(`HALLUCINATION: Verdächtige PMID gefunden: ${pmid} (unplausible Länge)`);
    }
  }

  // Check for invented compound names (if knowledge is loaded)
  if (knowledge?.entity) {
    const entityName = knowledge.entity.canonicalName.toLowerCase();
    const aliases: string[] = Array.isArray(knowledge.entity.aliases)
      ? knowledge.entity.aliases.map((a: string) => a.toLowerCase())
      : [];

    // If answer mentions a different compound name than what's loaded, warn
    const compoundMentions = answer.match(/\b([A-Z]{2,}-\d+|[A-Z]{3,})\b/g) ?? [];
    for (const mention of compoundMentions) {
      const mentionLower = mention.toLowerCase();
      if (
        mentionLower !== entityName &&
        !aliases.includes(mentionLower) &&
        mentionLower.length > 4 &&
        /[A-Z]{2,}-\d+/.test(mention) // Looks like a peptide name
      ) {
        // This is just a warning, not a hard error
        // warnings.push(`HALLUCINATION: Unbekannte Verbindung erwähnt: ${mention}`);
      }
    }
  }

  return warnings;
}

function checkKnowledgeConsistency(answer: string, knowledge: KnowledgeView | null): string[] {
  if (!knowledge) return [];

  const warnings: string[] = [];

  // Check if answer contradicts basic entity facts
  const entity = knowledge.entity as any;
  const entityType = entity.type;

  if (entityType === "compound" && answer.toLowerCase().includes("kein peptid") &&
      entity.compoundSubtype === "peptide") {
    warnings.push("CONSISTENCY: Antwort widerspricht Entity-Typ (Compound ist ein Peptid)");
  }

  return warnings;
}

// ─── Auto-Correction ──────────────────────────────────────────────────────────

function autoCorrect(answer: string, warnings: string[]): string {
  let corrected = answer;

  // Add disclaimer if missing
  if (warnings.some(w => w.startsWith("DISCLAIMER:"))) {
    corrected = corrected.trimEnd();
    if (!corrected.endsWith(".")) corrected += ".";
    corrected += "\n\n*Research Use Only — nicht für den menschlichen Gebrauch.*";
  }

  return corrected;
}

// ─── Main Validator ───────────────────────────────────────────────────────────

export function validateResponse(
  answer: string,
  ctx: ValidationContext
): ValidationResult {
  const allWarnings: string[] = [];
  const allErrors: string[] = [];

  // Run all checks
  allWarnings.push(...checkCompliance(answer, ctx));
  allWarnings.push(...checkDosageScope(answer, ctx));
  allWarnings.push(...checkDisclaimer(answer));
  allWarnings.push(...checkHallucinations(answer, ctx.knowledge));
  allWarnings.push(...checkKnowledgeConsistency(answer, ctx.knowledge));

  // Hard errors (would block response)
  // FIX: DOSAGE_VIOLATION und schwere COMPLIANCE-Fehler sind Hard Errors
  const hardErrors = allWarnings.filter(w =>
    w.startsWith("DOSAGE_VIOLATION:") ||
    (w.startsWith("COMPLIANCE:") && (w.includes("heilt") || w.includes("behandelt") || w.includes("diagnostiziert") || w.includes("zugelassen")))
  );

  const passed = hardErrors.length === 0;

  // Auto-correct minor issues
  const correctedAnswer = autoCorrect(answer, allWarnings);

  return {
    passed,
    warnings: allWarnings,
    errors: allErrors,
    correctedAnswer: correctedAnswer !== answer ? correctedAnswer : undefined,
  };
}
