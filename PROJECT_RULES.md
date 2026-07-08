# 369 Knowledge OS — PROJECT RULES
**Version 1.0 | Frozen: 08.07.2026 | Verbindlich für alle Entwickler und Agenten**

---

## Grundsatz

Architecture Frozen. Keine neuen Grundstrukturen. Keine neuen Datenmodelle. Keine neuen Framework-Entscheidungen. Nur Inhalte, Agenten, Academy, Shop, SEO, GEO.

---

## Entwicklungsregeln

### Vor jedem Commit

- TypeScript-Check lokal erfolgreich: `pnpm typecheck`
- Kein Push mit fehlgeschlagenem Build
- Liste aller geänderten Dateien mit Erklärung

### Deployment

- Backend: Git-Push auf `main` → Railway deployt automatisch
- Frontend: `pnpm build` lokal → Netlify-Deploy via API-Script
- Kein manuelles Deployment ohne vorherigen TypeScript-Check

### Security

- Alle Write-Endpoints (POST/PUT/PATCH/DELETE) müssen `requireAdmin` haben
- Ausnahmen nur für Agent-API-Key-authentifizierte Endpoints (POST /api/agents/suggestions, POST /api/agent/query)
- Keine Secrets im Code. Ausschließlich `process.env.*`
- Kein Debug-Code in Production

### Datenbank

- Schema-Änderungen nur via Drizzle: `pnpm drizzle-kit generate` → SQL prüfen → anwenden
- Keine direkten `ALTER TABLE` ohne Backup
- Keine BLOB/BYTEA Spalten für Dateien

### Content

- Alle Entities durchlaufen: `new → pending_review → published`
- AI-generierter Content landet immer in `pending_review`
- Kein direktes Publish ohne Review
- Knowledge OS ist Single Source of Truth — keine Wissensduplikate

### Agenten

- Agenten greifen ausschließlich über `/api/agent/query` oder `/api/agents/entity/:slug` auf Daten zu
- Kein Agent kennt interne Datenbankstrukturen
- Agenten unterscheiden sich durch Rolle, Verhalten, Ziele — nicht durch getrennte Wissensstände

---

## Was nie geändert werden darf (ohne explizite Freigabe)

- `drizzle/schema.ts` Tabellenstruktur
- `server/_core/` (Auth, Context, OAuth)
- `KNOWLEDGE_OS_CONTRACT.md`
- Deployment-Pipeline (`.github/workflows/deploy.yml`)
- CORS-Konfiguration in `index.ts`

---

## Erlaubte Operationen im Betriebsmodus

- Neue Entities in der Datenbank anlegen
- Content Blocks für bestehende Entities generieren
- Neue Agent-API-Keys erstellen
- SEO-Metadaten aktualisieren
- Neue Themen/Topics anlegen
- Glossarbegriffe hinzufügen
- Studien und Protokolle hinzufügen

---
## Migrations-Regeln (RULE-MIGRATION-01)

**Hintergrund:** Am 08.07.2026 schlug das Railway-Deployment fehl, weil Drizzle-generierte Migrations-Dateien `ALTER TYPE ADD VALUE` und `ALTER TABLE ADD COLUMN` ohne `IF NOT EXISTS` enthielten. Dies führte zu PostgreSQL-Fehlern (42710, 42701) bei Re-Deployments.

**Pflichtprüfung vor jedem Migrations-Commit:**
```bash
grep "ALTER TYPE.*ADD VALUE\|ALTER TABLE.*ADD COLUMN" packages/backend/drizzle/*.sql | grep -v "IF NOT EXISTS"
```
Das Ergebnis muss leer sein. Wenn nicht: alle gefundenen Statements mit `IF NOT EXISTS` ergänzen.

**Kein Push ohne erfolgreichen TypeScript-Check und leere Idempotenz-Prüfung.**
