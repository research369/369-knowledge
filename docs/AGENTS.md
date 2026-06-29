# AGENTS.md — Guide für KI-Agenten

> Dieses Dokument beschreibt, wie externe KI-Agenten (BEDO AI Core, PepGPT, Manus, Cursor, Claude, n8n) mit dem 369 Research Scientific OS interagieren.

---

## Grundprinzip

Das System ist eine **offene Content-API**. Agenten können:

- Entitäten anlegen
- KI-Content generieren lassen
- Entitäten bearbeiten
- Entitäten zur Freigabe stellen (status → `review`)

Agenten können **NICHT**:
- Entitäten direkt veröffentlichen (`publish` erfordert Admin-Session)
- Ontologie-Regeln ändern
- Andere Agenten-Keys erstellen oder widerrufen

---

## Authentifizierung

```bash
# API-Key im Header
X-API-Key: sk_live_xxxxxxxxxxxxxxxx

# Oder als Query-Parameter (nur für GET-Requests)
GET /api/entities?api_key=sk_live_xxx
```

API-Keys werden vom Admin-Panel unter `/admin` → "API Keys" erstellt.

---

## Vollständiger Workflow: Neuen Eintrag anlegen

### Schritt 1 — Entität anlegen

```bash
POST /api/entities
X-API-Key: $API_KEY
Content-Type: application/json

{
  "id": "550e8400-e29b-41d4-a716-446655440000",  // UUID v4
  "canonicalName": "Retatrutid",
  "type": "compound",                              // compound | guide | stack | steroid | supplement
  "language": "de",
  "tags": ["GLP-1", "GIP", "Glucagon", "Gewichtsverlust"],
  "casNumber": "2381089-83-2",
  "seoDescription": "Retatrutid ist ein triple-agonistischer Peptid-Wirkstoff..."
}
```

**Response:**
```json
{
  "entity": {
    "id": "550e8400-...",
    "canonicalName": "Retatrutid",
    "status": "draft",
    ...
  }
}
```

### Schritt 2 — KI-Content generieren

```bash
POST /api/entities/550e8400-e29b-41d4-a716-446655440000/generate
X-API-Key: $API_KEY
```

Die KI generiert automatisch:
- `what_is` — Was ist Retatrutid? (L1)
- `simple_explanation` — Einfach erklärt (L1)
- `mechanism` × 3–5 — Wirkmechanismen (L2)
- `research_result` × 3 — Forschungsergebnisse mit PubMed-Quellen (L2)
- `faq` × 5 — Häufige Fragen (L3)
- `safety` — Sicherheitshinweise (L3)
- `references` — Quellenangaben (L3)

**Response:**
```json
{
  "entity": { "status": "draft", ... },
  "blocks": [
    {
      "id": "...",
      "blockType": "what_is",
      "layer": "L1",
      "title": "Was ist Retatrutid?",
      "body": "...",
      "sources": ["https://pubmed.ncbi.nlm.nih.gov/..."],
      ...
    },
    ...
  ]
}
```

### Schritt 3 — Zur Freigabe stellen

```bash
PATCH /api/entities/550e8400-e29b-41d4-a716-446655440000
X-API-Key: $API_KEY
Content-Type: application/json

{
  "status": "review"
}
```

Ab diesem Punkt ist der Eintrag im Admin-Panel unter "Review" sichtbar und wartet auf manuelle Freigabe.

### Schritt 4 — Freigabe (nur Admin)

Freigabe erfolgt ausschließlich über das Admin-Panel (`/admin`) durch einen Menschen mit Admin-Session. Kein Agent kann diesen Schritt überspringen.

---

## Entitäten lesen

### Alle veröffentlichten Entitäten

```bash
GET /api/entities?status=published
# Keine Authentifizierung erforderlich
```

### Einzelne Entität mit Blöcken und Relationen

```bash
GET /api/entities/{id}
# Keine Authentifizierung für published-Entitäten
# X-API-Key erforderlich für draft/review
```

### Nach Typ filtern

```bash
GET /api/entities?type=compound&status=published
GET /api/entities?type=guide&status=published
```

---

## Relationen anlegen

Relationen verbinden zwei Entitäten im Knowledge Graph.

```bash
POST /api/relations
X-API-Key: $API_KEY
Content-Type: application/json

{
  "fromEntityId": "uuid-bpc157",
  "relationType": "ACTIVATES",     // Erlaubte Typen: siehe unten
  "toEntityId": "uuid-vegf",
  "layer": "L2",
  "scope": ["public", "academy"],
  "description": "BPC-157 aktiviert VEGF-Signalwege und fördert Angiogenese",
  "sources": ["https://pubmed.ncbi.nlm.nih.gov/12345678/"],
  "confidenceScore": 0.85,
  "evidenceLevel": "in_vitro"
}
```

### Erlaubte Relationstypen

| Typ | Bedeutung |
|---|---|
| `ACTIVATES` | Aktiviert / hochreguliert |
| `INHIBITS` | Hemmt / herunterreguliert |
| `SYNERGIZES_WITH` | Synergistisch |
| `ANTAGONIZES` | Antagonistisch |
| `METABOLIZED_BY` | Wird metabolisiert durch |
| `TARGETS` | Zielt auf (Rezeptor/Protein) |
| `RELATED_TO` | Verwandt mit |
| `USED_IN` | Verwendet in (Stack/Protokoll) |
| `REQUIRES` | Benötigt (z.B. BAC Water) |
| `CONTRAINDICATED_WITH` | Kontraindiziert mit |

### Verbotene Relationstypen (Compliance)

Diese Relationen werden vom System abgelehnt:
- `CURES` — Heilt
- `TREATS` — Behandelt
- `PREVENTS` — Verhindert (Krankheit)
- `DIAGNOSES` — Diagnostiziert

---

## Content-Blöcke direkt erstellen

Für spezifische Inhalte ohne KI-Generierung:

```bash
POST /api/blocks
X-API-Key: $API_KEY
Content-Type: application/json

{
  "entityId": "uuid",
  "layer": "L1",
  "scope": ["public"],
  "blockType": "what_is",
  "title": "Was ist Retatrutid?",
  "body": "Retatrutid ist ein...",
  "sources": ["https://pubmed.ncbi.nlm.nih.gov/37499183/"],
  "sortOrder": 1
}
```

### Block-Typen

| Typ | Beschreibung | Layer |
|---|---|---|
| `what_is` | Grundlegende Erklärung | L1 |
| `simple_explanation` | Einfach erklärt | L1 |
| `mechanism` | Wirkmechanismus | L2 |
| `research_result` | Forschungsergebnis | L2 |
| `faq` | Häufige Frage + Antwort | L3 |
| `safety` | Sicherheitshinweise | L3 |
| `references` | Quellenangaben | L3 |
| `materials` | Materialliste (für Guides) | L1 |
| `steps` | Schritt-für-Schritt | L2 |
| `common_errors` | Häufige Fehler | L2 |

---

## Fehlerbehandlung

```json
// 400 Bad Request — Validierungsfehler
{ "error": "canonicalName is required" }

// 401 Unauthorized — Fehlender oder ungültiger API-Key
{ "error": "Invalid API key" }

// 403 Forbidden — Ontologie-Verletzung
{ "error": "Relation type CURES is not allowed by ontology" }

// 404 Not Found
{ "error": "Entity not found" }

// 409 Conflict — Duplikat
{ "error": "Entity with this canonicalName already exists" }
```

---

## Für n8n Workflows

```json
// HTTP Request Node
{
  "method": "POST",
  "url": "https://wissen.369research.eu/api/entities",
  "headers": {
    "X-API-Key": "{{ $env.KNOWLEDGE_API_KEY }}",
    "Content-Type": "application/json"
  },
  "body": {
    "id": "{{ $json.uuid }}",
    "canonicalName": "{{ $json.name }}",
    "type": "{{ $json.type }}"
  }
}
```

---

## Für BEDO AI Core

BEDO erhält einen dedizierten API-Key mit den Berechtigungen:
- `entities:create`
- `entities:generate`
- `entities:update`
- `relations:create`
- `blocks:create`
- `blocks:update`

BEDO kann **nicht**:
- `entities:publish`
- `admin:*`
- `apikeys:*`

---

## Was NIEMALS geändert werden darf

- `packages/backend/src/db/schema.ts` — Nur mit expliziter Freigabe und Migration
- `packages/backend/src/db/seed-ontology.ts` — Ontologie-Änderungen erfordern Review
- `netlify.toml` — Deploy-Konfiguration
- `.env` Dateien — Nie committen

---

## Kontakt

Fragen zur API: Pakko — 369 Research
