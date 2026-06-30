# 369 Research – Finale Systemarchitektur

> **Verbindlich ab:** 30. Juni 2026
> **Status:** Eingefroren – keine weiteren Grundsatzänderungen
> **Fokus ab jetzt:** Umsetzung, Goldstandard, Skalierung

---

## Vision

Das Knowledge Portal ist nicht das Endprodukt.

Es ist das **wissenschaftliche Fundament des gesamten 369 Research Ökosystems** – und langfristig das Fundament der BEDO Holding.

Das Ziel ist ein **Scientific Knowledge Operating System**, das sämtliche Inhalte, Agenten und Anwendungen versorgt. Es existiert genau eine zentrale Wissensbasis. Alle Systeme greifen darauf zu.

---

## Single Source of Truth

Es darf niemals doppelte Wissensbestände geben.

| Falsch | Richtig |
|---|---|
| Website-Inhalte | Eine Entity |
| Academy-Inhalte | Eine Wahrheit |
| Shop-Inhalte | Mehrere Darstellungen |
| WhatsApp-Inhalte | — |
| Agenten-Inhalte | — |

Alle Frontends lesen dieselbe Wissensbasis. Jede Entity existiert genau einmal. Ihre Inhalte werden über **Layer** und **Scope** für verschiedene Darstellungen gefiltert.

---

## Entity-Architektur: 5 Layer

Jede Entity besitzt fünf Ebenen. Alle Ebenen greifen auf dieselbe Entity zu – es gibt keine zweite Datenbank.

```
Knowledge Layer    → öffentlich, SEO, GEO, Portal
       ↓
Academy Layer      → exklusiv, Premium, Login-geschützt
       ↓
Product Layer      → First-Class-Entities, Shop-Relationen
       ↓
Agent Layer        → strukturiert, maschinenlesbar, API-optimiert
       ↓
API Layer          → externe Systeme, BEDO Holding, Partner
```

Jede Ebene besitzt eigene Content-Blöcke (`scope`-Feld) und Berechtigungen. Es existiert trotzdem nur eine einzige Entity.

### Scope-Werte in `content_blocks.scope`

| Scope | Beschreibung |
|---|---|
| `portal` | Öffentlich sichtbar auf dem Knowledge Portal |
| `academy` | Nur für eingeloggte Academy-Nutzer |
| `bedo` | Interne BEDO-Systeme und Agenten |
| `api` | Externe API-Konsumenten |
| `shop` | Shop-Frontend und Produktseiten |
| `whatsapp` | WhatsApp-Agenten-optimierte Kurzversionen |

---

## Knowledge Portal

Das öffentliche Wissensportal dient ausschließlich dazu:

- wissenschaftlich fundiertes Wissen bereitzustellen
- Vertrauen aufzubauen
- organischen SEO- und GEO-Traffic zu gewinnen
- komplexe Biologie verständlich zu erklären
- Nutzer intelligent durch Themen zu führen

**Scope:** `portal`

**Enthält:** Definition, Kurz erklärt, Einfach erklärt, Mechanismus, Biologie, Studienlage, Evidenz, FAQ, Glossar, Quellen, Zusammenfassungen.

**Enthält bewusst nicht:** Dosierungsstrategien, Protokolle, Kombinationen, Troubleshooting, Downloads, Videos.

---

## Academy

Die Academy besitzt **keine eigene Wissensdatenbank**.

Sie erweitert dieselben Entities um exklusive Premium-Content-Blöcke mit `scope: ["academy"]`.

**Academy-exklusive Inhalte:**

- vollständige Research-Protokolle
- Dosierungsstrategien (Research)
- Rekonstitution und Lagerung
- Kombinationen und Zeitpläne
- praktische Erfahrungen und Troubleshooting
- Monitoring und Biomarker
- Videos, Checklisten, PDFs, Downloads
- Lernmodule (strukturiert, mit Fortschrittserfassung)

Die Academy ist keine Kopie des Wissensportals. Sie ist die wissenschaftliche Vertiefung derselben Wissensbasis.

---

## Shop

Produkte sind **First-Class-Entities** mit `type: "product"`.

Produkte bestehen nicht nur aus Shopdaten. Sie besitzen eigene Relationen zu:

- Wirkstoffen (`has_ingredient`)
- Studien (`studied_in`)
- Mechanismen (`activates`, `modulates`)
- Protokollen (`has_protocol`)
- Stacks (`part_of_stack`)
- Academy-Modulen (`has_academy_module`)
- FAQs (`has_faq`)
- Zubehör (`has_accessory`)
- verwandten Produkten (`related_to`)

Der Shop nutzt dieselbe Wissensbasis. Produktseiten können direkt auf Entity-Seiten verlinken.

---

## Agenten

Alle Agenten greifen auf dieselbe Knowledge Base zu.

| Agent | Primäre Aufgabe |
|---|---|
| BEDO AI | Allgemeine Wissensvermittlung |
| WhatsApp-Agent | Kundenkommunikation, FAQ, Routing |
| Sales-Agent | Produktempfehlungen, Stacks |
| Support-Agent | Troubleshooting, Guides |
| Shop-Agent | Produktrelationen, Kombinationen |
| Academy-Agent | Lernfortschritt, Wissenslücken |
| Research-Agent | Neue Studien, Quellen-Import |

**Agenten dürfen:** Fragen beantworten, Quellen auswerten, Studien erkennen, FAQs vorschlagen, Relationen ergänzen, Protokolle vorbereiten, Produkte sinnvoll verknüpfen.

**Agenten dürfen nicht:** Direkt veröffentlichen. Alle Änderungen landen zuerst in der Review Queue.

---

## Lernendes System – Bidirektionaler Fluss

```
Knowledge Base (Single Source of Truth)
         ↓
Website · Academy · Shop · Agenten · APIs
         ↓
Erkenntnisse und Vorschläge (12 Suggestion-Typen)
         ↓
Review Queue (wissenschaftliche Prüfung)
         ↓
Freigabe durch Reviewer
         ↓
Knowledge Base (aktualisiert, versioniert)
```

### 12 Suggestion-Typen

| Typ | Auslöser | Ziel |
|---|---|---|
| `new_faq` | Sales-Agent, WhatsApp | FAQ-Entity |
| `new_guide` | Support-Agent | Guide-Entity |
| `new_source` | Research-Agent | Source-Draft |
| `new_module` | Academy-Agent | Academy-Modul |
| `new_relation` | Shop-Agent, Research-Agent | Relation |
| `new_stack` | Shop-Agent | Stack-Entity |
| `update_block` | beliebiger Agent | Content Block |
| `new_glossar` | WhatsApp-Agent | Glossar-Eintrag |
| `new_entity` | beliebiger Agent | neue Entity |
| `update_entity` | beliebiger Agent | Entity-Update |
| `new_protocol` | Research-Agent | Protokoll |
| `new_collection` | beliebiger Agent | Collection |

**Sicherheitsregel:** Content-Suggestions (FAQ, Guide, Block, Glossar) benötigen zwingend `sourceIds`. Kein unzitiertes Wissen kann in die Knowledge Base.

---

## Verständlichkeit

> *So einfach wie möglich. So wissenschaftlich wie nötig.*

Unsere Zielgruppe sind keine Wissenschaftler. Es sind Menschen, die biologische Zusammenhänge verstehen möchten.

Jede Entity besitzt mindestens vier Verständlichkeitsebenen:

| Level | Beschreibung | Lesezeit |
|---|---|---|
| `brief` | 30-Sekunden-Erklärung, ein Absatz | ~30s |
| `simple` | Einfach erklärt, Analogien, kein Jargon | 2–4 min |
| `scientific` | Biologischer Hintergrund, Mechanismen | 5–10 min |
| `expert` | Vollständige wissenschaftliche Tiefe | 10+ min |

Jeder Fachbegriff wird erklärt oder automatisch mit dem Glossar verknüpft (`glossar_terms`-Feld in Content Blocks).

---

## Customer Journey

Jede Entity führt den Nutzer logisch weiter – nicht werblich, sondern fachlich sinnvoll.

```
Was ist das?
     ↓
Wie funktioniert es?
     ↓
Welche Evidenz gibt es?
     ↓
Welche biologischen Mechanismen sind beteiligt?
     ↓
Welche verwandten Themen gibt es?
     ↓
Welche Studien sollte ich lesen?
     ↓
Welche Academy-Inhalte vertiefen das Thema?
     ↓
Welche Protokolle passen dazu?
     ↓
Welche Produkte gehören dazu?
     ↓
Welche weiteren Themen könnten interessant sein?
```

So entsteht ein intelligentes Wissensnetzwerk statt einzelner Seiten.

---

## Zukunftssicherheit

Jede neue Funktion muss sich in diese Architektur einfügen.

**Verboten:**
- Parallele Wissensdatenbanken
- Doppelte Inhalte in verschiedenen Systemen
- Hardcodierte Inhalte außerhalb der Knowledge Base

**Erlaubt:**
- Neue Frontends (Mobile App, B2B-Portal, Partner-API)
- Neue Agenten (spezialisierte Rollen)
- Neue Entity-Typen (innerhalb des bestehenden Schemas)
- Neue Scopes (für neue Frontends)

Alle zukünftigen Entwicklungen – Website, Academy, Shop, Agenten, APIs, Mobile Apps und weitere Unternehmen innerhalb der BEDO Holding – greifen auf dieselbe zentrale Wissensbasis zu.

---

## Implementierungs-Checkliste für jede neue Funktion

Vor der Implementierung jeder neuen Funktion ist zu prüfen:

- [ ] Liest die Funktion aus der Knowledge Base (nicht aus einer eigenen Datenbasis)?
- [ ] Kann die Funktion Erkenntnisse als Suggestions zurückgeben?
- [ ] Landen alle Suggestions in der zentralen Review Queue?
- [ ] Wird kein doppelter Wissensbestand aufgebaut?
- [ ] Werden die richtigen Scopes und Layer verwendet?
- [ ] Ist der Academy-Layer korrekt abgegrenzt (Login-Pflicht)?

---

## Konformitätsstatus des bestehenden Systems

| Grundsatz | Status | Anmerkung |
|---|---|---|
| Single Source of Truth | ✅ | Eine DB, alle Systeme lesen dieselbe Basis |
| Entity-Layer (Knowledge) | ✅ | L1–L7 + scope-Feld implementiert |
| Entity-Layer (Academy) | ✅ | scope `["academy"]` vorhanden |
| Entity-Layer (Product) | ✅ | `type: "product"` im entityTypeEnum |
| Entity-Layer (Agent) | ✅ | Agent-API-Keys + Suggestion-Endpunkte |
| Entity-Layer (API) | ✅ | REST-API vorhanden |
| Bidirektionaler Fluss | ✅ | 12 Suggestion-Typen + Review Queue |
| Verständlichkeitsebenen | ✅ | comprehension_level + target_audience |
| Customer Journey | ⚠️ | Felder vorhanden, Frontend-Umsetzung ausstehend |
| GEO / JSON-LD | ✅ | geo_qa + json_ld + schema_org |
| Ökosystem-Links | ✅ | ecosystem_links Tabelle, Platzhalter gesetzt |
| Confidence Score | ✅ | confidence_scores Tabelle + Router |
| Decision History | ✅ | decision_history Tabelle |
| Scientific Tasks | ✅ | scientific_tasks Tabelle + Router |

**Legende:** ✅ implementiert | ⚠️ teilweise / ausstehend | ❌ fehlt

---

## Nächste Entwicklungsschritte (Priorität)

1. **BPC-157 Review abschließen** – Lifecycle-Status auf `published`, Goldstandard-Flag setzen
2. **Customer Journey Frontend** – "Nächster Schritt"-Sektion auf Entity-Seiten
3. **TB-500 nach Goldstandard** – zweite vollständige Entity
4. **Academy-Modul-Struktur** – Lernpfade auf Basis der Knowledge Base
5. **Confidence-Badge** auf öffentlichen Entity-Seiten

---

*Dokument eingefroren: 30. Juni 2026 | 369 Research Knowledge Portal*
