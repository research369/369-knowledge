/**
 * Scientific Ontology Seed
 * Defines all allowed and forbidden relations between entity types.
 * This is the "constitution" of the knowledge system.
 */
import { db } from "./index.js";
import { ontologyRelations, ontologyEntityRules } from "./schema.js";
import { v4 as uuidv4 } from "uuid";

const ALLOWED_RELATIONS = [
  // Compound relations
  { from: "compound", rel: "belongs_to", to: "biological_process" },
  { from: "compound", rel: "activates", to: "pathway" },
  { from: "compound", rel: "activates", to: "protein" },
  { from: "compound", rel: "activates", to: "receptor" },
  { from: "compound", rel: "inhibits", to: "pathway" },
  { from: "compound", rel: "inhibits", to: "protein" },
  { from: "compound", rel: "inhibits", to: "enzyme" },
  { from: "compound", rel: "influences", to: "biological_process" },
  { from: "compound", rel: "influences", to: "organ" },
  { from: "compound", rel: "relevant_for", to: "disease" },
  { from: "compound", rel: "relevant_for", to: "biological_process" },
  { from: "compound", rel: "studied_in", to: "study" },
  { from: "compound", rel: "combined_with", to: "compound" },
  { from: "compound", rel: "has_product", to: "product" },
  // Pathway relations
  { from: "pathway", rel: "activates", to: "protein" },
  { from: "pathway", rel: "activates", to: "gene" },
  { from: "pathway", rel: "regulates", to: "biological_process" },
  { from: "pathway", rel: "is_part_of", to: "biological_process" },
  // Protein/Gene/Receptor/Enzyme
  { from: "protein", rel: "is_part_of", to: "pathway" },
  { from: "gene", rel: "is_part_of", to: "pathway" },
  { from: "receptor", rel: "is_part_of", to: "pathway" },
  { from: "enzyme", rel: "is_part_of", to: "pathway" },
  // Study relations
  { from: "study", rel: "evidenced_by", to: "compound" },
  { from: "study", rel: "confirms", to: "study" },
  { from: "study", rel: "contradicts", to: "study" },
  { from: "study", rel: "updates", to: "study" },
  // FAQ
  { from: "faq", rel: "answers", to: "compound" },
  { from: "faq", rel: "answers", to: "guide" },
  { from: "faq", rel: "answers", to: "glossary_term" },
  // Academy module
  { from: "academy_module", rel: "requires", to: "academy_module" },
  { from: "academy_module", rel: "recommends", to: "compound" },
  // Product
  { from: "product", rel: "belongs_to", to: "compound" },
  // Guide
  { from: "guide", rel: "relevant_for", to: "compound" },
  { from: "guide", rel: "relevant_for", to: "biological_process" },
] as const;

const FORBIDDEN_RELATIONS = [
  { from: "product", rel: "relevant_for", to: "disease", reason: "Compliance: Heilversprechen verboten" },
  { from: "compound", rel: "relevant_for", to: "disease", reason: "Compliance: medizinische Aussage verboten — nur 'relevant_for biological_process' erlaubt" },
] as const;

export async function seedOntology() {
  console.log("Seeding Scientific Ontology...");

  // Insert allowed relations
  for (const r of ALLOWED_RELATIONS) {
    await db
      .insert(ontologyRelations)
      .values({
        id: uuidv4(),
        fromEntityType: r.from as any,
        relationType: r.rel as any,
        toEntityType: r.to as any,
        allowed: true,
      })
      .onConflictDoNothing();
  }

  // Insert entity rules
  const entityRules = [
    {
      type: "compound",
      required: ["canonicalName", "type", "categories"],
      layers: ["L1", "L2", "L3", "L4", "L5", "L6"],
      scopes: ["portal", "academy", "bedo"],
    },
    {
      type: "guide",
      required: ["canonicalName", "type"],
      layers: ["L1", "L2", "L3"],
      scopes: ["portal", "academy", "bedo"],
    },
    {
      type: "faq",
      required: ["canonicalName", "type"],
      layers: ["L1"],
      scopes: ["portal", "academy", "bedo"],
    },
    {
      type: "glossary_term",
      required: ["canonicalName", "type"],
      layers: ["L1"],
      scopes: ["portal", "academy", "bedo"],
    },
    {
      type: "academy_module",
      required: ["canonicalName", "type"],
      layers: ["L4", "L5", "L6"],
      scopes: ["academy", "bedo"],
    },
  ];

  for (const rule of entityRules) {
    await db
      .insert(ontologyEntityRules)
      .values({
        id: uuidv4(),
        entityType: rule.type as any,
        requiredFields: rule.required,
        allowedLayers: rule.layers,
        allowedScopes: rule.scopes,
      })
      .onConflictDoNothing();
  }

  console.log(`Ontology seeded: ${ALLOWED_RELATIONS.length} allowed relations, ${entityRules.length} entity rules.`);
}
