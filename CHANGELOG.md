# 369 Knowledge OS — CHANGELOG

---

## [1.0.0] — 2026-07-08 — Architecture Frozen

### Sicherheit
- `requireAdmin` auf `PUT /api/agents/suggestions/:id/review` hinzugefügt
- `requireAdmin` auf alle `prompts.router.ts` Write-Endpoints hinzugefügt
- `requireAdmin` auf alle `sources.router.ts` Write-Endpoints hinzugefügt
- `requireAdmin` auf `POST/PUT/DELETE /api/agents/keys` hinzugefügt
- Hardcoded Secret `369Research2024!` aus `runtime.router.ts` entfernt
- `ADMIN_SECRET` als Railway-Umgebungsvariable gesetzt (64-Zeichen zufälliger Token)

### Bugfixes
- Frontend-Routing: `/wissen?type=X` wertet Query-Parameter korrekt aus
- Backend `type`-Filter: `GET /api/entities?type=X` filtert jetzt wirklich nach Typ
- Glossar: `type=glossar` → `type=glossary_term` (korrekter DB-Enum-Wert)
- Canonical URLs: Alle auf `portal.369research.eu` korrigiert (war: `369-knowledge.netlify.app`)
- Sitemap-Domain: `portal.369research.eu` (war: `wissen.369research.eu`)
- robots.txt: Sitemap-URL auf `portal.369research.eu/sitemap.xml` korrigiert

### Infrastruktur
- CNAME `portal.369research.eu → 369-knowledge.netlify.app` bei Njalla eingetragen
- `VITE_API_URL` in Netlify auf `https://backend-production-77f3.up.railway.app/api` gesetzt
- Backend CORS für `portal.369research.eu` erweitert
- `_redirects` Datei für SPA-Routing in Netlify-Deploy integriert

### Dokumentation
- `MASTER_CONTEXT.md` erstellt
- `PROJECT_RULES.md` erstellt
- `SECURITY.md` erstellt
- `CHANGELOG.md` erstellt

---

## [0.9.0] — 2026-06-30 — Pre-Freeze

### Features
- Knowledge Portal Frontend (React + Vite + Tailwind)
- Backend API (Express + TypeScript + Drizzle ORM + PostgreSQL)
- Content Factory mit AI-Generierung (OpenAI)
- Agent Runtime mit API-Key-System
- Review/Publish Workflow (new → pending_review → approved → published)
- Glossar, Themen, Compounds, Studien, Protokolle, Stacks
- Admin-Panel mit Entity-Verwaltung
- Sitemap + robots.txt
- JSON-LD Schema.org in EntityDetail
- Learning Pipeline (Filesystem-basiert, für V2 in DB migrieren)

---

## Versionsschema

`MAJOR.MINOR.PATCH`

- `MAJOR`: Breaking Change an API oder Datenmodell
- `MINOR`: Neue Feature (additive)
- `PATCH`: Bugfix, Security-Fix, Content-Update
