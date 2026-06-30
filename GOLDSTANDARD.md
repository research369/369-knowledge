# BPC-157 Goldstandard — Verbindliche Referenz

**Status:** In Entwicklung
**Ziel:** Master-Template für alle zukünftigen Entities

---

## Verbindliche Grundsätze

### 1. Goldstandard-Prinzip

BPC-157 ist kein einzelner Artikel. BPC-157 ist der Stresstest für die gesamte Plattform.

Jede Architektur-Lücke, die beim Aufbau entsteht, wird **zuerst geschlossen** — bevor der Content fertiggestellt wird.

Erst wenn BPC-157 als Goldstandard freigegeben wurde, beginnt die Skalierung auf weitere Inhalte.

### 2. Content-Grundsatz

> **So einfach wie möglich. So wissenschaftlich wie nötig.**

Wir schreiben wie exzellente Wissenschaftsjournalisten.
- Nicht wie ein wissenschaftliches Paper
- Nicht wie ein Lexikon
- Nicht wie Werbung

Jede Entity bedient drei Zielgruppen gleichzeitig:
- **Einsteiger** — verstehen das Grundprinzip in 30 Sekunden
- **Fortgeschrittene** — verstehen den biologischen Zusammenhang
- **Experten** — finden Mechanismen, Studien, Evidenz, Limitationen

### 3. Drei Verständlichkeitsebenen (Pflicht für jeden Content Block)

| Ebene | Name | Ziel | Sprache |
|---|---|---|---|
| L1 | Kurz erklärt | 30 Sekunden, Grundprinzip | Keine Fachbegriffe |
| L2 | Einfach erklärt | Biologischer Zusammenhang | Fachbegriffe erklärt, Analogien |
| L3+ | Wissenschaftlicher Hintergrund | Mechanismen, Studien, Evidenz | Präzise, zitiert |

**Kontrollfrage bei jedem Abschnitt:** Versteht ein interessierter Laie diesen Abschnitt?

---

## Vollständige Anforderungen für BPC-157

### Content Blocks (L1–L7)
- [ ] L1 — Kurzbeschreibung (30-Sekunden-Erklärung)
- [ ] L2 — Einfache Erklärung (biologischer Zusammenhang, Analogien)
- [ ] L3 — Wissenschaftlicher Hintergrund (Mechanismen, Signalwege)
- [ ] L4 — Studien & Evidenz (Humanstudien, Tierstudien, In-vitro)
- [ ] L5 — Anwendungsbereiche (Gewebereparatur, Entzündung, Neuroprotektion, GI-Trakt)
- [ ] L6 — Limitationen & offene Fragen
- [ ] L7 — FAQ (häufigste Fragen, verständlich beantwortet)

### Quellen
- [ ] Mindestens 10 Quellen mit PMID oder DOI
- [ ] Evidenzlevel pro Quelle (1a–5)
- [ ] Bias-Risiko bewertet
- [ ] KI-Zusammenfassung auf Deutsch
- [ ] Confidence Score berechnet

### Relationen (Entities)
- [ ] Mechanismen: VEGF-Aktivierung, GH-Achse, NO-Synthase, EGF-Rezeptor
- [ ] Signalwege: FAK-Paxillin, MAPK/ERK, PI3K/Akt, mTOR
- [ ] Rezeptoren: VEGFR, EGFR, Integrine
- [ ] Gene: VEGF, eNOS, FAK
- [ ] Biomarker: VEGF, EGF, NO, IGF-1
- [ ] Organe: Magen-Darm-Trakt, Muskel, Sehne, Knochen, Gehirn, Herz
- [ ] Erkrankungen: IBD, Magengeschwür, Sehnenverletzung, Muskelriss, Knochenbruch
- [ ] Symptome: Entzündung, Schmerz, Wundheilungsstörung
- [ ] Verwandte Compounds: TB-500, GHK-Cu, SS-31

### Topics
- [ ] Peptide (primär)
- [ ] Regeneration & Heilung
- [ ] Entzündung & Immunsystem
- [ ] Magen-Darm-Gesundheit
- [ ] Neuroprotektion
- [ ] Sportverletzungen

### Studien (eigene Entities)
- [ ] Mindestens 5 Studien als eigene Study-Entities mit vollständigen Metadaten

### FAQ (eigene Entities)
- [ ] Mindestens 10 FAQ-Einträge als eigene Entities

### Glossar
- [ ] Alle Fachbegriffe im Text verknüpft mit Glossar-Entities

### SEO
- [ ] seoTitle (optimiert für "BPC-157" + Longtail)
- [ ] seoDescription (155 Zeichen, Mehrwert kommuniziert)
- [ ] seoKeywords (10–15 Keywords)
- [ ] canonicalUrl

### GEO (Generative Engine Optimization)
- [ ] Strukturierte Fragen und Antworten für KI-Suchmaschinen
- [ ] Klare Definitionen am Anfang jedes Blocks
- [ ] Zitierbare Aussagen mit Quellenangabe

### JSON-LD / Schema.org
- [ ] MedicalSubstance oder Drug Schema
- [ ] BreadcrumbList
- [ ] FAQPage
- [ ] Article mit author, datePublished, dateModified

### Ökosystem-Verknüpfungen (Datenmodell, nicht öffentlich)
- [ ] Passende Guides (ecosystem_links)
- [ ] Passende Research-Protokolle (ecosystem_links)
- [ ] Passende Stacks (ecosystem_links)
- [ ] Passende Produkte (ecosystem_links)
- [ ] Shop-Verknüpfungen (ecosystem_links)
- [ ] Academy-Verknüpfungen (ecosystem_links)

### Decision History
- [ ] Lifecycle-Transition: draft → review → published
- [ ] Mindestens 1 Decision-Eintrag mit Evidenzbegründung

---

## Identifizierte Architektur-Lücken

Beim Aufbau des Goldstandards wurden folgende Lücken identifiziert, die **vor dem Content** geschlossen werden:

### Lücke 1: Verständlichkeitsebenen im Content Block
**Problem:** `content_blocks` hat kein Feld für die Verständlichkeitsebene (Kurz/Einfach/Wissenschaftlich).
**Lösung:** Neues Feld `comprehension_level` (enum: `brief` | `simple` | `scientific` | `all`) + `reading_time_seconds`.

### Lücke 2: GEO-Felder fehlen
**Problem:** Kein strukturiertes Feld für GEO-optimierte Fragen/Antworten und zitierbare Aussagen.
**Lösung:** Neues Feld `geo_qa` (JSONB: Array von {question, answer, source}) auf `entities`.

### Lücke 3: JSON-LD / Schema.org fehlt
**Problem:** Kein Feld für strukturierte Metadaten.
**Lösung:** Neues Feld `schema_org` (JSONB) und `json_ld` (JSONB) auf `entities`.

### Lücke 4: Glossar-Verknüpfungen
**Problem:** Kein Mechanismus um Fachbegriffe im Text automatisch mit Glossar-Entities zu verknüpfen.
**Lösung:** Neues Feld `glossar_terms` (JSONB: Array von {term, entityId, slug}) auf `content_blocks`.

### Lücke 5: Reading Time und Zielgruppe pro Block
**Problem:** Kein Feld für geschätzte Lesezeit und Zielgruppe.
**Lösung:** `reading_time_seconds` (int) und `target_audience` (enum: `beginner` | `intermediate` | `expert` | `all`) auf `content_blocks`.

### Lücke 6: Canonical URL
**Problem:** Kein dediziertes Feld für canonicalUrl (aktuell nur slug).
**Lösung:** Feld `canonical_url` auf `entities`.

### Lücke 7: Ecosystem Links unvollständig
**Problem:** `ecosystem_links` Tabelle existiert, aber kein Feld für `notes` und `sort_order`.
**Lösung:** Felder `notes` (text) und `sort_order` (int) ergänzen.

---

*Dokument wird während des Goldstandard-Aufbaus kontinuierlich aktualisiert.*
