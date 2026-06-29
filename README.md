# 369 Research — Scientific Operating System (Knowledge Layer)

> **Phase 1 — Wissensportal & Content API**  
> Eigenständiges, vollständig isoliertes Projekt. Kein Eingriff in Shop, WaWi oder peptidpen.de.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22.x-green)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-Private-red)](./LICENSE)

---

## Was ist das?

Ein **semantisches Wissenssystem** für Research Compounds, Peptide, Praxis-Guides und Stacks.

```
wissen.369research.eu          → Öffentliches Wissensportal (L1–L3)
wissen.369research.eu/admin    → Admin-Panel mit KI-Generierung
/api/*                         → Content API (für Agenten, BEDO, PepGPT)
```

Das System besteht aus drei Schichten:

1. **Knowledge Graph** — Entitäten, Relationen, Ontologie-Regeln
2. **Content API** — vollständig dokumentiert, API-Key-Auth, für externe Agenten offen
3. **Darstellungsschicht** — Portal (öffentlich) + Admin (privat)

---

## Schnellstart

### Voraussetzungen

- Node.js 22+
- pnpm 9+
- PostgreSQL (Railway empfohlen)
- OpenAI API Key

### Setup

```bash
git clone https://github.com/research369/369-knowledge.git
cd 369-knowledge
pnpm install

# Backend konfigurieren
cp packages/backend/.env.example packages/backend/.env
# .env ausfüllen (siehe unten)

# Datenbank migrieren
cd packages/backend
pnpm db:migrate
pnpm db:seed-ontology   # Ontologie-Regeln einspielen

# Entwicklungsserver starten
cd ../..
pnpm dev
```

### Umgebungsvariablen (Backend)

| Variable | Beschreibung | Pflicht |
|---|---|---|
| `DATABASE_URL` | PostgreSQL Connection String | ✅ |
| `OPENAI_API_KEY` | OpenAI API Key für KI-Generierung | ✅ |
| `ADMIN_PASSWORD` | Admin-Panel Passwort | ✅ |
| `JWT_SECRET` | Session-Signing Secret (min. 32 Zeichen) | ✅ |
| `PORT` | Server-Port (Standard: 3001) | ❌ |
| `CORS_ORIGIN` | Erlaubte Frontend-Origin | ❌ |

### Umgebungsvariablen (Frontend)

| Variable | Beschreibung |
|---|---|
| `VITE_API_URL` | Backend-URL (Standard: `/api` via Proxy) |

---

## Projektstruktur

```
369-knowledge/
├── packages/
│   ├── backend/                    # Express + Drizzle + PostgreSQL
│   │   ├── src/
│   │   │   ├── db/
│   │   │   │   ├── schema.ts       # Knowledge Graph Datenmodell
│   │   │   │   ├── index.ts        # DB-Verbindung
│   │   │   │   ├── migrate.ts      # Migration runner
│   │   │   │   └── seed-ontology.ts # Ontologie-Seed
│   │   │   ├── routes/
│   │   │   │   ├── entities.router.ts      # CRUD + Publish + Generate
│   │   │   │   ├── relations.router.ts     # Graph-Kanten
│   │   │   │   ├── content-blocks.router.ts # Content-Blöcke
│   │   │   │   └── admin-auth.router.ts    # Login + API-Keys
│   │   │   ├── services/
│   │   │   │   ├── ai-generate.service.ts  # OpenAI Integration
│   │   │   │   └── ontology.service.ts     # Ontologie-Validierung
│   │   │   ├── middleware/
│   │   │   │   └── auth.ts                 # API-Key + Session Auth
│   │   │   └── index.ts                    # Express Server
│   │   ├── drizzle.config.ts
│   │   └── package.json
│   │
│   └── frontend/                   # React 18 + Vite + Tailwind
│       ├── src/
│       │   ├── pages/
│       │   │   ├── Portal.tsx      # Öffentliche Hub-Seite
│       │   │   ├── EntityDetail.tsx # Detailseite pro Compound
│       │   │   └── Admin.tsx       # Admin-Panel
│       │   ├── lib/
│       │   │   ├── api.ts          # API-Client (alle Endpunkte)
│       │   │   └── auth.tsx        # Admin-Auth Context
│       │   ├── styles/
│       │   │   └── globals.css     # 369 Design System
│       │   └── App.tsx             # Client-seitiges Routing
│       └── package.json
│
├── netlify.toml                    # Netlify Deploy-Konfiguration
├── pnpm-workspace.yaml
└── package.json
```

---

## API-Referenz

Vollständige Dokumentation: [`docs/API.md`](./docs/API.md)

### Authentifizierung

```bash
# API-Key (für Agenten/externe Systeme)
curl -H "X-API-Key: your_key" https://wissen.369research.eu/api/entities

# Admin-Session (für Admin-Panel)
curl -X POST https://wissen.369research.eu/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"password": "..."}'
```

### Wichtigste Endpunkte

```
GET    /api/entities              → Alle Entitäten (public, gefiltert nach status=published)
GET    /api/entities/:id          → Einzelne Entität mit Blöcken und Relationen
POST   /api/entities              → Neue Entität anlegen [Admin]
POST   /api/entities/:id/generate → KI-Content generieren [Admin]
POST   /api/entities/:id/publish  → Freigabe erteilen [Admin]
PATCH  /api/entities/:id          → Entität bearbeiten [Admin]
DELETE /api/entities/:id          → Entität löschen [Admin]
```

---

## Für KI-Agenten

Vollständige Anleitung: [`docs/AGENTS.md`](./docs/AGENTS.md)

**Kurzfassung:**

```bash
# Neuen Compound anlegen und KI-Content generieren
curl -X POST /api/entities \
  -H "X-API-Key: $API_KEY" \
  -d '{"id": "uuid", "canonicalName": "Retatrutid", "type": "compound"}'

curl -X POST /api/entities/{id}/generate \
  -H "X-API-Key: $API_KEY"

# Zur Freigabe stellen (status → review)
curl -X PATCH /api/entities/{id} \
  -H "X-API-Key: $API_KEY" \
  -d '{"status": "review"}'
```

Freigabe (`publish`) erfordert immer eine Admin-Session — kein Agent kann direkt publishen.

---

## Deployment

### Netlify (Frontend)

```bash
# Automatisch via GitHub Actions bei Push auf main
# Oder manuell:
cd packages/frontend && pnpm build
# dist/ Ordner auf Netlify deployen
```

### Railway (Backend)

```bash
# Railway CLI
railway up --service knowledge-api
```

Detaillierte Anleitung: [`docs/DEPLOY.md`](./docs/DEPLOY.md)

---

## Was dieses Projekt NICHT ist

- Kein Teil des 369research.eu Shops
- Kein Teil der WaWi (Warenwirtschaft)
- Kein Teil von peptidpen.de
- Kein Manus-Webdev-Projekt

Alle vier Systeme sind vollständig voneinander isoliert und teilen keine Datenbank, keinen Code und keine Infrastruktur.

---

## Compliance

Alle öffentlichen Inhalte sind als **"Research Use Only"** gekennzeichnet. Das System enthält:
- Altersbestätigung (18+) vor dem Zugang
- Disclaimer-Banner auf allen Seiten
- Keine Dosierungsangaben im öffentlichen Layer (L1–L3)
- Keine Heilsversprechen
- Schema.org-Markup für wissenschaftliche Artikel

---

## Lizenz

Proprietär — 369 Research. Alle Rechte vorbehalten.
