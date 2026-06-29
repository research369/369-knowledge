import { db } from "../db/index.js";
import { ontologyRelations } from "../db/schema.js";
import { and, eq } from "drizzle-orm";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates whether a relation between two entity types is allowed by the Scientific Ontology.
 */
export async function validateRelation(
  fromEntityType: string,
  relationType: string,
  toEntityType: string
): Promise<ValidationResult> {
  const rule = await db
    .select()
    .from(ontologyRelations)
    .where(
      and(
        eq(ontologyRelations.fromEntityType, fromEntityType as any),
        eq(ontologyRelations.relationType, relationType as any),
        eq(ontologyRelations.toEntityType, toEntityType as any)
      )
    )
    .limit(1);

  if (rule.length === 0) {
    return {
      valid: false,
      errors: [
        `Relation "${relationType}" from "${fromEntityType}" to "${toEntityType}" is not defined in the Scientific Ontology. Only explicitly allowed relations may be added to the Knowledge Graph.`,
      ],
    };
  }

  if (!rule[0].allowed) {
    return {
      valid: false,
      errors: [
        `Relation "${relationType}" from "${fromEntityType}" to "${toEntityType}" is explicitly FORBIDDEN by the Scientific Ontology. ${rule[0].description ?? ""}`,
      ],
    };
  }

  return { valid: true, errors: [] };
}

/**
 * Validates an entity before insertion/update.
 */
export function validateEntity(data: {
  type: string;
  canonicalName: string;
}): ValidationResult {
  const errors: string[] = [];

  if (!data.canonicalName || data.canonicalName.trim().length === 0) {
    errors.push("canonicalName is required and must not be empty.");
  }

  if (!data.type) {
    errors.push("type is required.");
  }

  return { valid: errors.length === 0, errors };
}
