# 369-Research Knowledge OS — Architekturprinzipien
**Verbindliches Referenzdokument — Stand: 30. Juni 2026**

---

## Grundsatz: Die Knowledge Base ist ein lernendes wissenschaftliches Betriebssystem

Die Knowledge Base ist kein statisches Nachschlagewerk. Sie ist das **wissenschaftliche Gehirn des gesamten 369-Research-Ökosystems** — die einzige Quelle für Wissen, auf die alle Systeme zugreifen, und gleichzeitig der einzige Ort, an dem neues Wissen dauerhaft gespeichert wird.

Jede neue Funktion, jeder neue Agent, jedes neue Frontend muss zwei Fragen beantworten:

1. **Kann sie Wissen aus der Knowledge Base nutzen?**
2. **Kann sie neues Wissen oder Verbesserungsvorschläge zurückgeben?**

Falls nicht, muss die Architektur entsprechend erweitert werden, bevor die Funktion implementiert wird.

---

## Bidirektionale Architektur

```
Knowledge Base (Single Source of Truth)
         ↓
Alle Frontends und Agenten
(Website, Shop, Academy, WhatsApp, BEDO AI, ...)
         ↓
Erkenntnisse und Vorschläge
(automatisch erkannt, niemals automatisch veröffentlicht)
         ↓
Review Queue
(wissenschaftliche Prüfung durch Admin)
         ↓
Freigabe
         ↓
Knowledge Base (verbessert)
```

Dieser Kreislauf ist der Kern des Systems. Ohne ihn ist die Knowledge Base ein totes Archiv. Mit ihm wird sie mit jeder Interaktion intelligenter.

---

## Wer greift auf die Knowledge Base zu

Alle Systeme des Ökosystems sind **spezialisierte Benutzer** der Knowledge Base — nicht eigenständige Wissensquellen.

| System | Liest aus KB | Schreibt zurück in KB |
|---|---|---|
| Website / Portal | ✅ Entities, Blocks, Relations, Topics | — |
| Shop (369research.eu) | ✅ Compound-Infos, Stacks, Protokolle | ✅ Häufig gemeinsam betrachtete Produkte → Relation-Vorschläge |
| Academy | ✅ Lernmodule basieren auf KB-Entities | ✅ Wissenslücken → Modul-Vorschläge |
| WhatsApp-Agent | ✅ FAQ, Glossar, Protokolle | ✅ Wiederkehrende Fragen → FAQ-Vorschläge |
| Sales-Agent | ✅ Compound-Infos, Stacks | ✅ Häufige Kundenfragen → FAQ-Vorschläge |
| Support-Agent | ✅ Guides, Protokolle, FAQ | ✅ Wiederkehrende Probleme → Guide-Vorschläge |
| Research-Agent | ✅ bestehende Studien, Quellen | ✅ Neue Studien → Source-Drafts |
| BEDO AI | ✅ gesamte KB | ✅ alle Suggestion-Typen |

---

## Die Review Queue — zentrales Sicherheitsnetz

**Kein Agent, kein System, kein Prozess darf Wissen direkt in die Knowledge Base schreiben.**

Alle Vorschläge landen in der `agent_suggestions`-Tabelle mit Status `pending`. Erst nach manueller Prüfung und Freigabe durch einen Admin wird der Inhalt in die Knowledge Base übernommen.

| Suggestion-Typ | Auslöser | Ziel |
|---|---|---|
| `new_faq` | Sales-Agent, WhatsApp-Agent | FAQ-Entity erstellen |
| `new_guide` | Support-Agent | Guide-Entity erstellen |
| `new_source` | Research-Agent | Source-Draft anlegen |
| `new_module` | Academy-Agent | Academy-Modul vorschlagen |
| `new_relation` | Shop-Agent, Research-Agent | Relation zwischen Entities |
| `new_stack` | Shop-Agent | Stack-Entity erstellen |
| `update_block` | beliebiger Agent | Content Block aktualisieren |
| `new_glossar` | WhatsApp-Agent | Glossar-Eintrag erstellen |

---

## Versionierung und Audit Trail

Jede Änderung an der Knowledge Base ist versioniert und nachvollziehbar. Das bedeutet:

- Jeder Content Block hat eine Versionsnummer und einen `generatedByAi`-Flag.
- Jede freigegebene Suggestion ist mit dem prüfenden Admin und dem Zeitstempel verknüpft.
- Jeder Agent-Zugriff wird im `agent_access_log` protokolliert.
- Prompts sind versioniert — ältere Versionen bleiben erhalten.

---

## Implementierungsregel für neue Features

Vor jeder neuen Funktion ist folgende Checkliste zu prüfen:

- [ ] Liest die Funktion aus der Knowledge Base (nicht aus einer eigenen Datenbasis)?
- [ ] Kann die Funktion Erkenntnisse als Suggestions zurückgeben?
- [ ] Landen alle Suggestions in der zentralen Review Queue?
- [ ] Ist die Suggestion mit Typ, Agent-Rolle, Konfidenz und Reasoning dokumentiert?
- [ ] Gibt es eine Admin-UI, um die Suggestion zu prüfen, zu genehmigen oder abzulehnen?

Wenn eine dieser Fragen mit Nein beantwortet wird, muss die Architektur zuerst erweitert werden.

---

## Konsequenzen für bestehende und geplante Systeme

### 369-knowledge (dieses Repository)
Die Knowledge Base selbst. Alle anderen Systeme sind Clients. Die `agent_suggestions`-Tabelle und die Review Queue sind bereits implementiert.

### 369-academy
Liest Lernmodule aus der Knowledge Base. Muss künftig Wissenslücken als Suggestions zurückschreiben können (Typ: `new_module`).

### 369-research WooCommerce Shop
Liest Compound-Infos und Stacks. Muss künftig Produktkombinationen und häufig gemeinsam betrachtete Produkte als Relation-Suggestions zurückschreiben können.

### WhatsApp-Agent (Peptide Coach)
Liest FAQ, Glossar, Protokolle. Muss wiederkehrende Fragen als `new_faq`- oder `new_glossar`-Suggestions zurückschreiben können.

### BEDO AI
Vollzugriff auf die Knowledge Base. Muss alle Suggestion-Typen unterstützen.

---

## Technische Umsetzung im bestehenden Schema

Die Infrastruktur für das lernende Ökosystem ist bereits vorhanden:

| Komponente | Tabelle / Datei | Status |
|---|---|---|
| Suggestion-Eingang | `agent_suggestions` | ✅ implementiert |
| Agent-Authentifizierung | `agent_api_keys` | ✅ implementiert |
| Audit Trail | `agent_access_log` | ✅ implementiert |
| Review Queue Admin-UI | Admin-Tab "Agents" | ✅ implementiert |
| Ökosystem-Verknüpfungen | `ecosystem_links` | ✅ Tabelle vorhanden, leer |
| Bidirektionaler API-Endpunkt | `POST /api/agents/suggestions` | ✅ implementiert |

Was noch fehlt: Die einzelnen Agenten (WhatsApp, Shop, Academy) müssen ihre Erkenntnisse aktiv an diesen Endpunkt senden. Das ist die Aufgabe der jeweiligen Integrationsprojekte.
