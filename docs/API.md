# API Reference — 369 Research Knowledge API

Base URL: `https://wissen.369research.eu/api`

---

## Authentifizierung

| Methode | Header | Für |
|---|---|---|
| API-Key | `X-API-Key: sk_live_xxx` | Agenten, externe Systeme |
| Admin-Session | Cookie `admin_token` | Admin-Panel |

Öffentliche GET-Endpunkte (nur `status=published`) benötigen keine Authentifizierung.

---

## Entities

### GET /entities

Alle Entitäten abrufen.

**Query-Parameter:**

| Parameter | Typ | Beschreibung |
|---|---|---|
| `status` | `draft\|review\|published\|archived` | Filter nach Status |
| `type` | `compound\|guide\|stack\|steroid\|supplement` | Filter nach Typ |
| `q` | string | Volltextsuche in Name und Tags |
| `limit` | number | Max. Ergebnisse (Standard: 50) |
| `offset` | number | Pagination-Offset |

**Response:**
```json
{
  "data": [Entity],
  "total": 42
}
```

---

### GET /entities/:id

Einzelne Entität mit allen Content-Blöcken und Relationen.

**Response:**
```json
{
  "entity": Entity,
  "blocks": [ContentBlock],
  "relations": [Relation]
}
```

---

### POST /entities `[Admin/Agent]`

Neue Entität anlegen.

**Body:**
```json
{
  "id": "uuid-v4",                    // Pflicht
  "canonicalName": "BPC-157",         // Pflicht
  "type": "compound",                 // Pflicht
  "language": "de",                   // Standard: "de"
  "aliases": ["Body Protection Compound"],
  "casNumber": "137525-51-0",
  "categories": ["Regeneration", "Wundheilung"],
  "tags": ["Kollagen", "Angiogenese"],
  "seoTitle": "BPC-157 — Wirkung und Forschungsstand",
  "seoDescription": "...",
  "seoKeywords": ["BPC-157 kaufen", "BPC-157 Wirkung"],
  "metrics": [
    { "label": "Reinheit", "value": "99", "unit": "%" }
  ]
}
```

---

### PATCH /entities/:id `[Admin/Agent]`

Entität aktualisieren. Nur übermittelte Felder werden geändert.

```json
{
  "status": "review",
  "seoDescription": "Neue Beschreibung..."
}
```

---

### POST /entities/:id/generate `[Admin/Agent]`

KI-Content für eine Entität generieren. Erstellt automatisch alle Content-Blöcke (L1–L3) basierend auf dem Entitätstyp.

**Keine Body-Parameter erforderlich.**

**Response:**
```json
{
  "entity": Entity,
  "blocks": [ContentBlock]
}
```

---

### POST /entities/:id/publish `[Admin-Session only]`

Entität veröffentlichen. Erfordert Admin-Session (kein API-Key).

---

### POST /entities/:id/unpublish `[Admin-Session only]`

Entität zurückziehen (status → `draft`).

---

### DELETE /entities/:id `[Admin-Session only]`

Entität und alle zugehörigen Blöcke und Relationen löschen.

---

## Content Blocks

### GET /blocks/entity/:entityId

Alle Blöcke einer Entität.

---

### POST /blocks `[Admin/Agent]`

Neuen Block anlegen.

```json
{
  "entityId": "uuid",
  "layer": "L1",
  "scope": ["public"],
  "blockType": "what_is",
  "title": "Was ist BPC-157?",
  "body": "...",
  "sources": ["https://pubmed.ncbi.nlm.nih.gov/..."],
  "sortOrder": 1
}
```

---

### PATCH /blocks/:id `[Admin/Agent]`

Block aktualisieren.

---

### DELETE /blocks/:id `[Admin/Agent]`

Block löschen.

---

## Relations

### GET /relations/entity/:entityId

Alle Relationen einer Entität (eingehend und ausgehend).

---

### POST /relations `[Admin/Agent]`

Neue Relation anlegen. Wird gegen die Ontologie validiert.

```json
{
  "fromEntityId": "uuid-bpc157",
  "relationType": "ACTIVATES",
  "toEntityId": "uuid-vegf",
  "layer": "L2",
  "scope": ["public"],
  "description": "...",
  "sources": ["https://pubmed.ncbi.nlm.nih.gov/..."],
  "confidenceScore": 0.85,
  "evidenceLevel": "in_vitro"
}
```

---

### DELETE /relations/:id `[Admin/Agent]`

Relation löschen.

---

## Admin Auth

### POST /admin/login

```json
{ "password": "..." }
```

Setzt Cookie `admin_token` (HttpOnly, Secure, SameSite=Strict).

---

### POST /admin/logout

Löscht Admin-Session.

---

### POST /admin/api-keys `[Admin-Session]`

Neuen API-Key erstellen.

```json
{
  "name": "BEDO AI Core",
  "permissions": ["entities:create", "entities:generate", "entities:update", "relations:create"],
  "expiresInDays": 365
}
```

**Response:**
```json
{
  "id": "...",
  "name": "BEDO AI Core",
  "key": "sk_live_xxxxx",   // Nur einmal sichtbar!
  "permissions": [...]
}
```

---

### GET /admin/api-keys `[Admin-Session]`

Alle API-Keys auflisten (ohne den eigentlichen Key-Wert).

---

### DELETE /admin/api-keys/:id `[Admin-Session]`

API-Key widerrufen.

---

## Datenmodelle

### Entity

```typescript
{
  id: string;                    // UUID v4
  type: string;                  // compound | guide | stack | steroid | supplement
  canonicalName: string;
  aliases: string[];
  language: string;              // "de" | "en"
  casNumber?: string;
  categories: string[];
  tags: string[];
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords: string[];
  heroImageUrl?: string;
  metrics: Array<{ label: string; value: string; unit?: string }>;
  status: "draft" | "review" | "published" | "archived";
  version: number;
  publishedAt?: string;          // ISO 8601
  createdAt: string;
  updatedAt: string;
}
```

### ContentBlock

```typescript
{
  id: string;
  entityId: string;
  layer: "L1" | "L2" | "L3" | "L4" | "L5" | "L6" | "L7";
  scope: string[];               // ["public"] | ["academy"] | ["public", "academy"]
  blockType: string;             // what_is | mechanism | faq | ...
  title?: string;
  body: string;
  sources: string[];             // PubMed URLs
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}
```

### Relation

```typescript
{
  id: string;
  fromEntityId: string;
  relationType: string;          // ACTIVATES | INHIBITS | SYNERGIZES_WITH | ...
  toEntityId: string;
  layer: string;
  scope: string[];
  description?: string;
  sources: string[];
  confidenceScore: number;       // 0.0 – 1.0
  evidenceLevel?: string;        // in_vitro | in_vivo | clinical | review
  createdAt: string;
}
```
