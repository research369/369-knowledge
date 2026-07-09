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
  // Peptide relations (same as compound but for peptide type)
  { from: "peptide", rel: "activates", to: "pathway" },
  { from: "peptide", rel: "activates", to: "protein" },
  { from: "peptide", rel: "activates", to: "receptor" },
  { from: "peptide", rel: "activates", to: "mechanism" },
  { from: "peptide", rel: "inhibits", to: "pathway" },
  { from: "peptide", rel: "inhibits", to: "protein" },
  { from: "peptide", rel: "influences", to: "biological_process" },
  { from: "peptide", rel: "influences", to: "organ" },
  { from: "peptide", rel: "improves", to: "biological_process" },
  { from: "peptide", rel: "improves", to: "mechanism" },
  { from: "peptide", rel: "relevant_for", to: "disease" },
  { from: "peptide", rel: "relevant_for", to: "biological_process" },
  { from: "peptide", rel: "combined_with", to: "peptide" },
  { from: "peptide", rel: "combined_with", to: "compound" },
  { from: "peptide", rel: "synergizes_with", to: "peptide" },
  { from: "peptide", rel: "synergizes_with", to: "compound" },
  { from: "peptide", rel: "belongs_to", to: "biological_process" },
  // Compound: add missing relation types
  { from: "compound", rel: "improves", to: "biological_process" },
  { from: "compound", rel: "improves", to: "mechanism" },
  { from: "compound", rel: "activates", to: "mechanism" },
  { from: "compound", rel: "synergizes_with", to: "compound" },
  { from: "compound", rel: "synergizes_with", to: "peptide" },
  // Mechanism relations
  { from: "mechanism", rel: "influences", to: "biological_process" },
  { from: "mechanism", rel: "relevant_for", to: "biological_process" },
  { from: "mechanism", rel: "activates", to: "pathway" },
  { from: "mechanism", rel: "activates", to: "protein" },
  { from: "mechanism", rel: "is_part_of", to: "pathway" },
  // FAQ: add missing targets
  { from: "faq", rel: "answers", to: "peptide" },
  { from: "faq", rel: "answers", to: "biological_process" },
  { from: "faq", rel: "answers", to: "mechanism" },
  // Sprint 2: Compound/Peptide → Biomarker
  { from: "compound", rel: "improves", to: "biomarker" },
  { from: "compound", rel: "influences", to: "biomarker" },
  { from: "compound", rel: "modulates", to: "biomarker" },
  { from: "peptide", rel: "improves", to: "biomarker" },
  { from: "peptide", rel: "influences", to: "biomarker" },
  { from: "peptide", rel: "modulates", to: "biomarker" },
  // Sprint 2: Compound/Peptide → Receptor (binds_to)
  { from: "compound", rel: "binds_to", to: "receptor" },
  { from: "peptide", rel: "binds_to", to: "receptor" },
  // Sprint 2: Receptor → Pathway/Receptor
  { from: "receptor", rel: "activates", to: "pathway" },
  { from: "receptor", rel: "synergizes_with", to: "receptor" },
  // Sprint 2: Mechanism → Mechanism/Pathway
  { from: "mechanism", rel: "activates", to: "mechanism" },
  { from: "mechanism", rel: "synergizes_with", to: "mechanism" },
  { from: "mechanism", rel: "activates", to: "mechanism" },
  // Sprint 2: Pathway → Pathway
  { from: "pathway", rel: "synergizes_with", to: "pathway" },
  { from: "pathway", rel: "activates", to: "pathway" },
  // Sprint 2: Compound synergizes_with Compound (both directions)
  { from: "compound", rel: "synergizes_with", to: "compound" },
  { from: "compound", rel: "synergizes_with", to: "peptide" },
  { from: "peptide", rel: "synergizes_with", to: "compound" },
  // Sprint 3: Compound/Peptide → Tissue/Organ
  { from: "compound", rel: "influences", to: "tissue" },
  { from: "compound", rel: "occurs_in", to: "organ" },
  { from: "compound", rel: "occurs_in", to: "tissue" },
  { from: "peptide", rel: "influences", to: "tissue" },
  { from: "peptide", rel: "occurs_in", to: "organ" },
  { from: "peptide", rel: "occurs_in", to: "tissue" },
  // Sprint 3: Compound/Peptide → Protein/Gene/Enzyme
  { from: "compound", rel: "activates", to: "gene" },
  { from: "compound", rel: "activates", to: "enzyme" },
  { from: "compound", rel: "inhibits", to: "gene" },
  { from: "compound", rel: "inhibits", to: "receptor" },
  { from: "compound", rel: "modulates", to: "protein" },
  { from: "compound", rel: "modulates", to: "gene" },
  { from: "compound", rel: "modulates", to: "enzyme" },
  { from: "peptide", rel: "activates", to: "gene" },
  { from: "peptide", rel: "activates", to: "enzyme" },
  { from: "peptide", rel: "inhibits", to: "gene" },
  { from: "peptide", rel: "inhibits", to: "receptor" },
  { from: "peptide", rel: "modulates", to: "protein" },
  { from: "peptide", rel: "modulates", to: "gene" },
  { from: "peptide", rel: "modulates", to: "enzyme" },
  // Sprint 3: Compound/Peptide → Study
  { from: "peptide", rel: "studied_in", to: "study" },
  { from: "study", rel: "evidenced_by", to: "peptide" },
  // Sprint 3: FAQ → more targets
  { from: "faq", rel: "answers", to: "pathway" },
  { from: "faq", rel: "answers", to: "disease" },
  // Sprint 3: Compound/Peptide → Academy
  { from: "compound", rel: "part_of_academy", to: "academy_module" },
  { from: "peptide", rel: "part_of_academy", to: "academy_module" },
  { from: "academy_module", rel: "recommends", to: "peptide" },
  // Sprint 3: Compound/Peptide combined_with Peptide
  { from: "compound", rel: "combined_with", to: "peptide" },
  // Sprint 3: Mechanism/Pathway → Disease/Biomarker
  { from: "mechanism", rel: "relevant_for", to: "disease" },
  { from: "mechanism", rel: "influences", to: "biomarker" },
  { from: "pathway", rel: "relevant_for", to: "disease" },
  { from: "pathway", rel: "influences", to: "biomarker" },
  // Sprint 3: Protein/Gene/Enzyme → Biological Process/Disease
  { from: "protein", rel: "influences", to: "biological_process" },
  { from: "gene", rel: "influences", to: "biological_process" },
  { from: "enzyme", rel: "influences", to: "biological_process" },
  { from: "protein", rel: "relevant_for", to: "disease" },
  { from: "gene", rel: "relevant_for", to: "disease" },
  // Sprint 3: Biomarker → Disease/Mechanism
  { from: "biomarker", rel: "marker_for", to: "disease" },
  { from: "biomarker", rel: "marker_for", to: "mechanism" },
  { from: "biomarker", rel: "measured_by", to: "compound" },
  // Phase 3 Domain Completion — GLP-1 Domain
  { from: "compound", rel: "modulates", to: "mechanism" },
  { from: "compound", rel: "modulates", to: "biological_process" },
  { from: "compound", rel: "activates", to: "biological_process" },
  { from: "compound", rel: "inhibits", to: "biological_process" },
  { from: "peptide", rel: "modulates", to: "mechanism" },
  { from: "peptide", rel: "modulates", to: "biological_process" },
  { from: "faq", rel: "relevant_for", to: "compound" },
  { from: "faq", rel: "relevant_for", to: "peptide" },
  { from: "faq", rel: "relevant_for", to: "mechanism" },
  { from: "faq", rel: "relevant_for", to: "biological_process" },
  { from: "mechanism", rel: "activates", to: "biological_process" },
  { from: "mechanism", rel: "modulates", to: "biological_process" },
  { from: "mechanism", rel: "modulates", to: "mechanism" },
  { from: "mechanism", rel: "inhibits", to: "mechanism" },
  { from: "mechanism", rel: "modulates", to: "biomarker" },
  { from: "mechanism", rel: "activates", to: "biomarker" },
  { from: "compound", rel: "activates", to: "biomarker" },
  { from: "compound", rel: "inhibits", to: "biomarker" },
  { from: "study", rel: "evidenced_by", to: "mechanism" },
  { from: "study", rel: "evidenced_by", to: "biological_process" },
  { from: "study", rel: "evidenced_by", to: "compound" },
  { from: "compound", rel: "combined_with", to: "compound" },
  { from: "compound", rel: "synergizes_with", to: "compound" },
  { from: "compound", rel: "improves", to: "biomarker" },
  { from: "peptide", rel: "improves", to: "biomarker" },
  // Domain 3: Protocol, Side Effect, Biomarker relations
  { from: "protocol", rel: "relevant_for", to: "compound" },
  { from: "protocol", rel: "relevant_for", to: "peptide" },
  { from: "protocol", rel: "relevant_for", to: "biomarker" },
  { from: "protocol", rel: "relevant_for", to: "protocol" },
  { from: "protocol", rel: "relevant_for", to: "mechanism" },
  { from: "side_effect", rel: "relevant_for", to: "compound" },
  { from: "side_effect", rel: "relevant_for", to: "peptide" },
  { from: "side_effect", rel: "influences", to: "compound" },
  { from: "side_effect", rel: "influences", to: "mechanism" },
  { from: "biomarker", rel: "relevant_for", to: "compound" },
  { from: "biomarker", rel: "relevant_for", to: "peptide" },
  { from: "biomarker", rel: "relevant_for", to: "protocol" },
  { from: "biomarker", rel: "relevant_for", to: "mechanism" },
  { from: "faq", rel: "relevant_for", to: "protocol" },
  { from: "faq", rel: "relevant_for", to: "side_effect" },
  { from: "faq", rel: "relevant_for", to: "biomarker" },
  // Domain 3: Anabolika / Harm Reduction & Monitoring
  { from: "compound", rel: "has_side_effect", to: "side_effect" },
  { from: "peptide", rel: "has_side_effect", to: "side_effect" },
  { from: "compound", rel: "monitored_by", to: "protocol" },
  { from: "peptide", rel: "monitored_by", to: "protocol" },
  { from: "compound", rel: "monitored_by", to: "biomarker" },
  { from: "peptide", rel: "monitored_by", to: "biomarker" },
  { from: "protocol", rel: "relevant_for", to: "compound" },
  { from: "protocol", rel: "relevant_for", to: "peptide" },
  { from: "protocol", rel: "measured_by", to: "biomarker" },
  { from: "side_effect", rel: "mitigated_by", to: "protocol" },
  { from: "side_effect", rel: "mitigated_by", to: "compound" },
  { from: "biomarker", rel: "relevant_for", to: "side_effect" },
  { from: "compound", rel: "activates", to: "mechanism" },
  { from: "compound", rel: "inhibits", to: "mechanism" },
  // Coach Intelligence Layer — Phase 3 (2026-07-09)
  // Compound/Peptide → Compound/Peptide (decision graph)
  { from: "compound", rel: "alternative_to", to: "compound" },
  { from: "compound", rel: "alternative_to", to: "peptide" },
  { from: "peptide", rel: "alternative_to", to: "peptide" },
  { from: "peptide", rel: "alternative_to", to: "compound" },
  { from: "compound", rel: "avoid_with", to: "compound" },
  { from: "compound", rel: "avoid_with", to: "peptide" },
  { from: "peptide", rel: "avoid_with", to: "compound" },
  { from: "peptide", rel: "avoid_with", to: "peptide" },
  { from: "compound", rel: "mechanism_overlap", to: "compound" },
  { from: "compound", rel: "mechanism_overlap", to: "peptide" },
  { from: "peptide", rel: "mechanism_overlap", to: "peptide" },
  { from: "peptide", rel: "mechanism_overlap", to: "compound" },
  { from: "compound", rel: "mechanism_complement", to: "compound" },
  { from: "compound", rel: "mechanism_complement", to: "peptide" },
  { from: "peptide", rel: "mechanism_complement", to: "peptide" },
  { from: "peptide", rel: "mechanism_complement", to: "compound" },
  { from: "compound", rel: "next_best_option", to: "compound" },
  { from: "compound", rel: "next_best_option", to: "peptide" },
  { from: "peptide", rel: "next_best_option", to: "peptide" },
  { from: "peptide", rel: "next_best_option", to: "compound" },
  { from: "compound", rel: "upgrade_path", to: "compound" },
  { from: "compound", rel: "upgrade_path", to: "peptide" },
  { from: "peptide", rel: "upgrade_path", to: "peptide" },
  { from: "peptide", rel: "upgrade_path", to: "compound" },
  { from: "compound", rel: "downgrade_path", to: "compound" },
  { from: "compound", rel: "downgrade_path", to: "peptide" },
  { from: "peptide", rel: "downgrade_path", to: "peptide" },
  { from: "peptide", rel: "downgrade_path", to: "compound" },
  { from: "compound", rel: "replacement_for", to: "compound" },
  { from: "compound", rel: "replacement_for", to: "peptide" },
  { from: "peptide", rel: "replacement_for", to: "peptide" },
  { from: "peptide", rel: "replacement_for", to: "compound" },
  { from: "compound", rel: "common_combination", to: "compound" },
  { from: "compound", rel: "common_combination", to: "peptide" },
  { from: "peptide", rel: "common_combination", to: "peptide" },
  { from: "peptide", rel: "common_combination", to: "compound" },
  // Compound/Peptide → Stack
  { from: "compound", rel: "stack_component_of", to: "stack" },
  { from: "peptide", rel: "stack_component_of", to: "stack" },
  // Compound/Peptide → Goal
  { from: "compound", rel: "goal_supports", to: "goal" },
  { from: "peptide", rel: "goal_supports", to: "goal" },
  { from: "compound", rel: "recommended_for", to: "goal" },
  { from: "peptide", rel: "recommended_for", to: "goal" },
  { from: "compound", rel: "recommended_for", to: "disease" },
  { from: "peptide", rel: "recommended_for", to: "disease" },
  { from: "compound", rel: "recommended_for", to: "biological_process" },
  { from: "peptide", rel: "recommended_for", to: "biological_process" },
  // Compound/Peptide → Tissue/Organ
  { from: "compound", rel: "tissue_target", to: "tissue" },
  { from: "peptide", rel: "tissue_target", to: "tissue" },
  { from: "compound", rel: "organ_target", to: "organ" },
  { from: "peptide", rel: "organ_target", to: "organ" },
  // Compound/Peptide → Injury/Recovery
  { from: "compound", rel: "injury_type", to: "disease" },
  { from: "peptide", rel: "injury_type", to: "disease" },
  { from: "compound", rel: "recovery_stage", to: "protocol" },
  { from: "peptide", rel: "recovery_stage", to: "protocol" },
  { from: "compound", rel: "works_best_when", to: "protocol" },
  { from: "peptide", rel: "works_best_when", to: "protocol" },
  { from: "compound", rel: "works_best_when", to: "biological_process" },
  { from: "peptide", rel: "works_best_when", to: "biological_process" },
  // Stack relations
  { from: "stack", rel: "goal_supports", to: "goal" },
  { from: "stack", rel: "recommended_for", to: "goal" },
  { from: "stack", rel: "recommended_for", to: "biological_process" },
  { from: "stack", rel: "tissue_target", to: "tissue" },
  { from: "stack", rel: "organ_target", to: "organ" },
  { from: "stack", rel: "synergizes_with", to: "stack" },
  { from: "stack", rel: "relevant_for", to: "protocol" },
  { from: "stack", rel: "monitored_by", to: "protocol" },
  { from: "stack", rel: "monitored_by", to: "biomarker" },
  { from: "stack", rel: "activates", to: "mechanism" },
  { from: "stack", rel: "has_side_effect", to: "side_effect" },
  { from: "stack", rel: "stack_component_of", to: "stack" },
  { from: "stack", rel: "relevant_for", to: "compound" },
  { from: "stack", rel: "relevant_for", to: "peptide" },

  // ─── Phase 4: Knowledge Engineering Mode ─────────────────────────────────
  // Persona relations
  { from: "compound", rel: "persona_fit", to: "persona" },
  { from: "peptide", rel: "persona_fit", to: "persona" },
  { from: "stack", rel: "persona_fit", to: "persona" },
  { from: "protocol", rel: "persona_fit", to: "persona" },
  { from: "persona", rel: "has_goal", to: "goal" },
  // Goal tree
  { from: "goal", rel: "goal_supports", to: "goal" },
  { from: "goal", rel: "recommended_for", to: "persona" },
  // Biomarker / Monitoring relations
  { from: "compound", rel: "biomarker_target", to: "biomarker" },
  { from: "compound", rel: "biomarker_target", to: "lab_parameter" },
  { from: "compound", rel: "monitor_with", to: "biomarker" },
  { from: "compound", rel: "monitor_with", to: "lab_parameter" },
  { from: "compound", rel: "side_effect_monitor", to: "biomarker" },
  { from: "compound", rel: "side_effect_monitor", to: "lab_parameter" },
  { from: "stack", rel: "monitor_with", to: "biomarker" },
  { from: "stack", rel: "monitor_with", to: "lab_parameter" },
  { from: "stack", rel: "biomarker_target", to: "biomarker" },
  // Stack phase / priority relations
  { from: "compound", rel: "stack_phase", to: "stack" },
  // Time axis relations
  { from: "compound", rel: "time_axis_phase", to: "protocol" },
  { from: "stack", rel: "time_axis_phase", to: "protocol" },
  // Decision rule relations
  { from: "coach_note", rel: "decision_rule", to: "compound" },
  { from: "coach_note", rel: "decision_rule", to: "stack" },
  { from: "coach_note", rel: "decision_rule", to: "protocol" },
  { from: "coach_note", rel: "recommended_for", to: "persona" },
  { from: "coach_note", rel: "recommended_for", to: "injury" },
  { from: "coach_note", rel: "recommended_for", to: "disease" },
  // FAQ answers
  { from: "faq", rel: "faq_answers", to: "compound" },
  { from: "faq", rel: "faq_answers", to: "stack" },
  { from: "faq", rel: "faq_answers", to: "injury" },
  // Contraindication relations
  { from: "compound", rel: "contraindicated_for", to: "persona" },
  { from: "compound", rel: "contraindicated_for", to: "disease" },
  // Synergy relations
  { from: "compound", rel: "synergy_strength", to: "compound" },
  // Peptide variants for Phase 4 Knowledge Engineering
  { from: "peptide", rel: "biomarker_target", to: "biomarker" },
  { from: "peptide", rel: "biomarker_target", to: "lab_parameter" },
  { from: "peptide", rel: "monitor_with", to: "biomarker" },
  { from: "peptide", rel: "monitor_with", to: "lab_parameter" },
  { from: "peptide", rel: "time_axis_phase", to: "protocol" },
  { from: "peptide", rel: "synergy_strength", to: "peptide" },
  { from: "peptide", rel: "synergy_strength", to: "compound" },
  { from: "compound", rel: "synergy_strength", to: "peptide" },
  { from: "peptide", rel: "contraindicated_for", to: "persona" },
  { from: "peptide", rel: "persona_fit", to: "persona" },
  // Injury → compound
  { from: "injury", rel: "recommended_for", to: "compound" },
  { from: "disease", rel: "recommended_for", to: "compound" },
  // Stack → Injury (Coach Layer)
  { from: "stack", rel: "recommended_for", to: "injury" },
  { from: "stack", rel: "recommended_for", to: "side_effect" },
  // Stack → Stack (comparison/upgrade)
  { from: "stack", rel: "alternative_to", to: "stack" },
  { from: "stack", rel: "upgrade_path", to: "stack" },
  { from: "stack", rel: "next_best_option", to: "stack" },
  // Compound/Peptide → Injury
  { from: "compound", rel: "recommended_for", to: "injury" },
  { from: "peptide", rel: "recommended_for", to: "injury" },
  // Compound/Peptide works_best_when → Tissue/Organ
  { from: "compound", rel: "works_best_when", to: "tissue" },
  { from: "peptide", rel: "works_best_when", to: "tissue" },
  { from: "compound", rel: "works_best_when", to: "organ" },
  { from: "peptide", rel: "works_best_when", to: "organ" },

  // Stack → Injury (Coach Layer)
  { from: "stack", rel: "recommended_for", to: "injury" },
  { from: "stack", rel: "recommended_for", to: "side_effect" },
  // Stack → Stack (comparison/upgrade)
  { from: "stack", rel: "alternative_to", to: "stack" },
  { from: "stack", rel: "upgrade_path", to: "stack" },
  { from: "stack", rel: "next_best_option", to: "stack" },
  // Compound/Peptide → Injury
  { from: "compound", rel: "recommended_for", to: "injury" },
  { from: "peptide", rel: "recommended_for", to: "injury" },
  // Compound/Peptide works_best_when → Tissue/Organ
  { from: "compound", rel: "works_best_when", to: "tissue" },
  { from: "peptide", rel: "works_best_when", to: "tissue" },
  { from: "compound", rel: "works_best_when", to: "organ" },
  { from: "peptide", rel: "works_best_when", to: "organ" },

  // ─── Phase 4: Knowledge Engineering Mode ─────────────────────────────────
  // Persona relations
  { from: "compound", rel: "persona_fit", to: "persona" },
  { from: "peptide", rel: "persona_fit", to: "persona" },
  { from: "stack", rel: "persona_fit", to: "persona" },
  { from: "protocol", rel: "persona_fit", to: "persona" },
  { from: "persona", rel: "has_goal", to: "goal" },
  // Goal tree
  { from: "goal", rel: "goal_supports", to: "goal" },
  { from: "goal", rel: "recommended_for", to: "persona" },
  // Biomarker / Monitoring relations
  { from: "compound", rel: "biomarker_target", to: "biomarker" },
  { from: "compound", rel: "biomarker_target", to: "lab_parameter" },
  { from: "compound", rel: "monitor_with", to: "biomarker" },
  { from: "compound", rel: "monitor_with", to: "lab_parameter" },
  { from: "compound", rel: "side_effect_monitor", to: "biomarker" },
  { from: "compound", rel: "side_effect_monitor", to: "lab_parameter" },
  { from: "stack", rel: "monitor_with", to: "biomarker" },
  { from: "stack", rel: "monitor_with", to: "lab_parameter" },
  { from: "stack", rel: "biomarker_target", to: "biomarker" },
  // Stack phase / priority relations
  { from: "compound", rel: "stack_phase", to: "stack" },
  // Time axis relations
  { from: "compound", rel: "time_axis_phase", to: "protocol" },
  { from: "stack", rel: "time_axis_phase", to: "protocol" },
  // Decision rule relations
  { from: "coach_note", rel: "decision_rule", to: "compound" },
  { from: "coach_note", rel: "decision_rule", to: "stack" },
  { from: "coach_note", rel: "decision_rule", to: "protocol" },
  { from: "coach_note", rel: "recommended_for", to: "persona" },
  { from: "coach_note", rel: "recommended_for", to: "injury" },
  { from: "coach_note", rel: "recommended_for", to: "disease" },
  // FAQ answers
  { from: "faq", rel: "faq_answers", to: "compound" },
  { from: "faq", rel: "faq_answers", to: "stack" },
  { from: "faq", rel: "faq_answers", to: "injury" },
  // Contraindication relations
  { from: "compound", rel: "contraindicated_for", to: "persona" },
  { from: "compound", rel: "contraindicated_for", to: "disease" },
  // Synergy relations
  { from: "compound", rel: "synergy_strength", to: "compound" },
  // Injury -> compound
  { from: "injury", rel: "recommended_for", to: "compound" },
  { from: "disease", rel: "recommended_for", to: "compound" },

  // ─── Phase 4: Knowledge Engineering Mode ─────────────────────────────────
  // Persona relations
  { from: "compound", rel: "persona_fit", to: "persona" },
  { from: "peptide", rel: "persona_fit", to: "persona" },
  { from: "stack", rel: "persona_fit", to: "persona" },
  { from: "protocol", rel: "persona_fit", to: "persona" },
  { from: "persona", rel: "has_goal", to: "goal" },
  // Goal tree
  { from: "goal", rel: "goal_supports", to: "goal" },
  { from: "goal", rel: "recommended_for", to: "persona" },
  // Biomarker / Monitoring relations
  { from: "compound", rel: "biomarker_target", to: "biomarker" },
  { from: "compound", rel: "biomarker_target", to: "lab_parameter" },
  { from: "compound", rel: "monitor_with", to: "biomarker" },
  { from: "compound", rel: "monitor_with", to: "lab_parameter" },
  { from: "compound", rel: "side_effect_monitor", to: "biomarker" },
  { from: "compound", rel: "side_effect_monitor", to: "lab_parameter" },
  { from: "stack", rel: "monitor_with", to: "biomarker" },
  { from: "stack", rel: "monitor_with", to: "lab_parameter" },
  { from: "stack", rel: "biomarker_target", to: "biomarker" },
  // Stack phase / priority relations
  { from: "compound", rel: "stack_phase", to: "stack" },
  // Time axis relations
  { from: "compound", rel: "time_axis_phase", to: "protocol" },
  { from: "stack", rel: "time_axis_phase", to: "protocol" },
  // Decision rule relations
  { from: "coach_note", rel: "decision_rule", to: "compound" },
  { from: "coach_note", rel: "decision_rule", to: "stack" },
  { from: "coach_note", rel: "decision_rule", to: "protocol" },
  { from: "coach_note", rel: "recommended_for", to: "persona" },
  { from: "coach_note", rel: "recommended_for", to: "injury" },
  { from: "coach_note", rel: "recommended_for", to: "disease" },
  // FAQ answers
  { from: "faq", rel: "faq_answers", to: "compound" },
  { from: "faq", rel: "faq_answers", to: "stack" },
  { from: "faq", rel: "faq_answers", to: "injury" },
  // Contraindication relations
  { from: "compound", rel: "contraindicated_for", to: "persona" },
  { from: "compound", rel: "contraindicated_for", to: "disease" },
  // Synergy relations
  { from: "compound", rel: "synergy_strength", to: "compound" },
  // Injury -> compound
  { from: "injury", rel: "recommended_for", to: "compound" },
  { from: "disease", rel: "recommended_for", to: "compound" },
] as const;

const FORBIDDEN_RELATIONS = [
  { from: "product", rel: "relevant_for", to: "disease", reason: "Compliance: Heilversprechen verboten" },
  { from: "compound", rel: "relevant_for", to: "disease", reason: "Compliance: medizinische Aussage verboten — nur 'relevant_for biological_process' erlaubt" },

  // ─── Phase 4: Knowledge Engineering Mode ─────────────────────────────────
  // Persona relations
  { from: "compound", rel: "persona_fit", to: "persona", reason: "Compound is suitable for this persona" },
  { from: "stack", rel: "persona_fit", to: "persona", reason: "Stack is designed for this persona" },
  { from: "protocol", rel: "persona_fit", to: "persona", reason: "Protocol is designed for this persona" },
  // Biomarker / Monitoring relations
  { from: "compound", rel: "biomarker_target", to: "biomarker", reason: "Compound affects this biomarker" },
  { from: "compound", rel: "biomarker_target", to: "lab_parameter", reason: "Compound affects this lab parameter" },
  { from: "compound", rel: "monitor_with", to: "biomarker", reason: "Monitor this biomarker when using compound" },
  { from: "compound", rel: "monitor_with", to: "lab_parameter", reason: "Monitor this lab parameter when using compound" },
  { from: "compound", rel: "side_effect_monitor", to: "biomarker", reason: "Monitor for side effect detection" },
  { from: "compound", rel: "side_effect_monitor", to: "lab_parameter", reason: "Monitor lab parameter for side effects" },
  { from: "stack", rel: "monitor_with", to: "biomarker", reason: "Monitor this biomarker when using stack" },
  { from: "stack", rel: "monitor_with", to: "lab_parameter", reason: "Monitor this lab parameter when using stack" },
  // Stack phase / priority relations
  { from: "compound", rel: "stack_phase", to: "stack", reason: "Compound belongs to stack with priority role" },
  // Time axis relations
  { from: "compound", rel: "time_axis_phase", to: "protocol", reason: "Compound is relevant in this recovery phase" },
  { from: "stack", rel: "time_axis_phase", to: "protocol", reason: "Stack is relevant in this recovery phase" },
  // Decision rule relations
  { from: "coach_note", rel: "decision_rule", to: "compound", reason: "IF-THEN decision rule leads to compound" },
  { from: "coach_note", rel: "decision_rule", to: "stack", reason: "IF-THEN decision rule leads to stack" },
  { from: "coach_note", rel: "decision_rule", to: "protocol", reason: "IF-THEN decision rule leads to protocol" },
  { from: "coach_note", rel: "recommended_for", to: "persona", reason: "Coach note is relevant for this persona" },
  { from: "coach_note", rel: "recommended_for", to: "injury", reason: "Coach note is relevant for this injury" },
  { from: "coach_note", rel: "recommended_for", to: "disease", reason: "Coach note is relevant for this disease" },
  // Sales / Academy relations
  { from: "compound", rel: "sales_trigger", to: "sales_flow", reason: "Compound triggers this sales flow" },
  { from: "stack", rel: "sales_trigger", to: "sales_flow", reason: "Stack triggers this sales flow" },
  { from: "compound", rel: "academy_covers", to: "academy_module", reason: "Academy covers this compound" },
  { from: "stack", rel: "academy_covers", to: "academy_module", reason: "Academy covers this stack" },
  { from: "faq", rel: "faq_answers", to: "compound", reason: "FAQ answers questions about this compound" },
  { from: "faq", rel: "faq_answers", to: "stack", reason: "FAQ answers questions about this stack" },
  { from: "faq", rel: "faq_answers", to: "injury", reason: "FAQ answers questions about this injury" },
  // Contraindication relations
  { from: "compound", rel: "contraindicated_for", to: "persona", reason: "Compound is contraindicated for this persona" },
  { from: "compound", rel: "contraindicated_for", to: "disease", reason: "Compound is contraindicated for this disease" },
  { from: "compound", rel: "contraindicated_with", to: "compound", reason: "Compounds should not be combined" },
  // Synergy relations
  { from: "compound", rel: "synergizes_with", to: "compound", reason: "General synergy between compounds" },
  { from: "compound", rel: "synergy_strength", to: "compound", reason: "Synergy quality rating between compounds" },
  // Goal tree relations
  { from: "goal", rel: "goal_supports", to: "goal", reason: "Goal leads to this higher goal (goal tree)" },
  { from: "goal", rel: "recommended_for", to: "persona", reason: "Goal is relevant for this persona" },
  // Injury → compound relations
  { from: "injury", rel: "recommended_for", to: "compound", reason: "Injury benefits from this compound" },
  { from: "disease", rel: "recommended_for", to: "compound", reason: "Disease benefits from this compound" },
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
