# 369 Knowledge — Goldstandard Template

**Status: EINGEFROREN** — Validiert durch BPC-157 Stresstest (30. Juni 2026)

Dieses Dokument ist das verbindliche Template für alle Entities im 369-knowledge System.
Jede neue Entity MUSS dieser Struktur folgen. Abweichungen erfordern eine explizite Entscheidung.

---

## Goldstandard-Prinzip

> So einfach wie möglich. So wissenschaftlich wie nötig.

Wir schreiben wie exzellente Wissenschaftsjournalisten — nicht wie ein Paper, nicht wie ein Lexikon, nicht wie Werbung.

Jede Entity verfolgt drei Ziele gleichzeitig:
1. **Wissenschaft erklären** — präzise, korrekt, ohne Vereinfachung die falsch ist
2. **Vertrauen aufbauen** — durch Transparenz über Evidenz, Limitationen und offene Fragen
3. **Den Nutzer führen** — logisch zum nächsten sinnvollen Schritt (nicht werblich)

---

## Entity-Pflichtfelder (Checkliste)

### Basis-Identität
- [ ] `id` — UUID (automatisch generiert, NIEMALS Slug als ID verwenden)
- [ ] `slug` — URL-freundlich, z.B. `bpc-157`
- [ ] `canonicalName` — Offizieller Name, z.B. `BPC-157`
- [ ] `type` — Entity-Typ (compound, mechanism, organ, disease, etc.)
- [ ] `compoundSubtype` — bei Compounds: peptide, small_molecule, etc.
- [ ] `aliases` — JSON-Array aller bekannten Namen
- [ ] `casNumber` — CAS-Nummer (bei Compounds)
- [ ] `molecularFormula` — Summenformel
- [ ] `molecularWeight` — Molekulargewicht mit Einheit

### Beschreibung
- [ ] `shortDescription` — 1–2 Sätze, neutral, wissenschaftlich korrekt
- [ ] `categories` — JSON-Array (z.B. ["Peptide", "Regeneration"])
- [ ] `tags` — JSON-Array für Suche und Filterung

### SEO
- [ ] `seoTitle` — max. 60 Zeichen, Keyword am Anfang
- [ ] `seoDescription` — max. 160 Zeichen, kein Heilversprechen
- [ ] `seoKeywords` — JSON-Array, 8–15 Keywords
- [ ] `canonicalUrl` — vollständige URL (https://wissen.369research.eu/compound/...)

### GEO (Generative Engine Optimization)
- [ ] `geoQa` — JSON-Array mit mind. 3 Frage-Antwort-Paaren
  - Format: `[{"question": "...", "answer": "...", "sourceId": null}]`
  - Fragen: Was ist X? Wie wirkt X? Welche Studien gibt es zu X?

### Strukturierte Daten
- [ ] `jsonLd` — Schema.org JSON-LD (Drug, ChemicalSubstance oder MedicalEntity)
- [ ] `schemaOrg` — Ergänzende Schema.org-Felder

### Lifecycle
- [ ] `lifecycleStatus` — draft → ai_draft → review → approved → published → monitoring
- [ ] `contentCompleteness` — 0–100 (manuell oder automatisch berechnet)
- [ ] `isGoldstandard` — true wenn als Template eingefroren

---

## Content Blocks (Pflicht für Goldstandard)

Jede Goldstandard-Entity benötigt mindestens 8 Content Blocks:

| Layer | Block-Typ | Verständlichkeit | Zielgruppe | Lesezeit |
|---|---|---|---|---|
| L1 | `summary` | `brief` | Einsteiger | 30s |
| L1 | `explanation` | `simple` | Fortgeschrittene | 2 min |
| L2 | `mechanism_brief` | `brief` | Einsteiger | 45s |
| L2 | `mechanism_simple` | `simple` | Fortgeschrittene | 4 min |
| L3 | `applications` | `all` | Alle | 6 min |
| L4 | `evidence_overview` | `scientific` | Experten | 5 min |
| L5 | `limitations` | `scientific` | Experten | 4 min |
| L7 | `faq` | `all` | Alle | 8 min |

### Drei Verständlichkeitsebenen (Pflicht für Mechanismus-Blöcke)

| Ebene | Name | Ziel | Sprache |
|---|---|---|---|
| `brief` | Kurz erklärt | 30 Sekunden, Grundprinzip | Keine Fachbegriffe |
| `simple` | Einfach erklärt | Biologischer Zusammenhang | Fachbegriffe erklärt, Analogien |
| `scientific` | Wissenschaftlicher Hintergrund | Mechanismen, Studien, Evidenz | Präzise, zitiert |

### Content-Regeln
- Keine Heilversprechen
- Keine Dosierungsempfehlungen für Menschen
- Immer: "In präklinischen Studien", "In Tiermodellen", "Research Use Only"
- Limitationen immer transparent kommunizieren
- Quellen immer angeben (PMID oder DOI)

---

## Relations (Pflicht für Goldstandard)

Mindestens 15 Relations pro Goldstandard-Entity:

| Kategorie | Mindestanzahl | Beispiel-Typen |
|---|---|---|
| Signalwege / Mechanismen | 3–5 | `activates`, `modulates`, `inhibits` |
| Proteine / Biomarker | 2–3 | `upregulates`, `influences` |
| Biologische Prozesse | 2–3 | `activates`, `improves`, `inhibits` |
| Organe / Gewebe | 3–5 | `improves`, `protects` |
| Erkrankungen | 2–4 | `treats`, `improves`, `worsens` |

### Gültige Relation-Typen (vollständige Liste)
```
activates | inhibits | upregulates | downregulates | binds_to | influences |
interacts_with | regulates | modulates | is_part_of | belongs_to | is_subtype_of |
contains | relevant_for | treats | improves | worsens | studied_in | evidenced_by |
contradicts | confirms | updates | combined_with | synergizes_with | antagonizes |
requires | recommends | occurs_in | expressed_in | codes_for | measured_by |
marker_for | answers | has_source | has_evidence | has_product | has_protocol |
has_stack | has_guide | part_of_academy | available_in_shop | related_topic | suggested_next
```

### Gültige Evidenzlevel (vollständige Liste)
```
preclinical | in_vitro | animal | pilot_human | clinical | rct | review | meta_analysis | anecdotal
```

**Wichtig:** NIEMALS Oxford-Evidenzlevel-Nummern (1a, 2b, 3, 4, 5) verwenden — nur die obigen Enum-Werte.

---

## Sources (Pflicht für Goldstandard)

Mindestens 5 wissenschaftliche Quellen. Korrekte Spalten der `sources`-Tabelle:

| Feld | Pflicht | Beschreibung |
|---|---|---|
| `id` | Ja | z.B. `src-bpc157-sikiric-2018` |
| `pmid` | Ja (wenn verfügbar) | PubMed ID |
| `doi` | Ja (wenn verfügbar) | Digital Object Identifier |
| `title` | Ja | Vollständiger Titel |
| `authors` | Ja | JSON-Array der Autoren (als Array!) |
| `journal` | Ja | Zeitschriftenname |
| `year` | Ja | Erscheinungsjahr (integer) |
| `evidenceLevel` | Ja | Gültiger Enum-Wert (s.o.) |
| `bias` | Ja | Bias-Risiko (low/moderate/high) |
| `funding` | Ja | Finanzierungsquelle |
| `aiSummaryDe` | Ja | Deutsche KI-Zusammenfassung |
| `qualityScore` | Ja | 0–100 |
| `isAnimal` | Ja | Boolean |
| `linkedEntityIds` | Ja | JSON-Array der verknüpften Entity-UUIDs |
| `status` | Ja | `published` für Goldstandard |

---

## Ökosystem-Links (Pflicht für Goldstandard)

Mindestens 4 Ökosystem-Verknüpfungen (können Platzhalter sein, `active: false`):

| Typ | System | Beschreibung |
|---|---|---|
| `academy_module` | academy | Lernmodul in der Academy |
| `shop_product` | shop | Produkt im Shop |
| `protocol` | portal | Anwendungsprotokoll |
| `stack` | portal | Kombinations-Stack |

---

## Seed-Migration Regeln (KRITISCH)

Gelernt aus dem BPC-157 Stresstest — diese Fehler dürfen nie wieder passieren:

### Regel 1: UUID-Pflicht
```typescript
// ❌ FALSCH — Slug als ID
const ENTITY_ID = 'bpc-157';

// ✅ KORREKT — UUID direkt
const ENTITY_ID = '7f796ffe-8714-46ec-aeb6-ac8f0e959bd0';
```

### Regel 2: Idempotenter Sentinel
```typescript
// ❌ FALSCH — prüft Infrastruktur-Feld das bereits existiert
if (columnExists('canonical_url')) return;

// ✅ KORREKT — prüft tatsächlichen Zielzustand
const bCount = blockCount >= 8;
const rCount = relCount >= 15;
if (bCount && rCount) return; // Bereits vollständig geseedet
```

### Regel 3: Enum-Validierung vor INSERT
Alle Enum-Werte müssen gegen das Schema geprüft werden:
- `relationType` → nur Werte aus `relationTypeEnum`
- `evidenceLevel` → nur Werte aus `evidenceLevelEnum`
- `lifecycleStatus` → nur Werte aus `lifecycleStatusEnum`

### Regel 4: Spalten-Konformität
INSERT-Spalten müssen exakt mit der Drizzle-Tabellendefinition übereinstimmen.
Vor jedem INSERT: `grep -n "pgTable" schema.ts` und Spalten vergleichen.

### Regel 5: Kein lifecycle_status in relations
Die `relations`-Tabelle hat KEIN `lifecycle_status`-Feld. Nicht einfügen.

---

## Stresstest-Ergebnisse: BPC-157 (30. Juni 2026)

### Gefundene und behobene Architektur-Lücken

| # | Lücke | Ursache | Fix |
|---|---|---|---|
| 1 | Seed-Migration übersprang gesamten Content | Sentinel prüfte `canonical_url` (existierte bereits aus Phase 2b) | Neuer Sentinel: prüft Blocks UND Relations Count |
| 2 | Alle Block-Inserts schlugen fehl | `entity_id = 'bpc-157'` statt UUID | UUID direkt im Seed hardcoded |
| 3 | Alle Relations-Inserts schlugen fehl | Ungültige Enum-Werte (`activates_pathway`, `heals`, `2b`) | Korrekte Enum-Werte aus Schema verwendet |
| 4 | Alle Sources-Inserts schlugen fehl | Falsche Spaltennnamen (`entity_ids`, `lifecycle_status`, `version`) | Korrekte Spalten der sources-Tabelle verwendet |
| 5 | Relations-Router gab leere Ergebnisse | `lifecycle_status` Feld existiert nicht in relations-Tabelle | Feld aus INSERT entfernt |

### Finale Verifikation (Live-DB)

```
Content Blocks: 8 / 8   ✅
Relations:     18 / 18   ✅
Sources:        5 / 5    ✅
Ecosystem Links: 4 / 4   ✅
```

---

## Nächste Entity: TB-500

TB-500 wird ausschließlich nach diesem Template aufgebaut.
Wenn TB-500 ohne grundlegende Architekturänderungen funktioniert, gilt die Entity-Struktur als validiert.
Erst danach beginnt die systematische Skalierung.

---

*Eingefroren: 30. Juni 2026 | Validiert durch: BPC-157 Stresstest | Commits: 3b874a2, 2008c6a, 717f26a*
