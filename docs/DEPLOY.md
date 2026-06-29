# Deployment Guide

---

## Architektur

```
GitHub (main branch)
  ├── push → Netlify (Frontend-Build, automatisch)
  └── push → Railway (Backend-Deploy, automatisch via Dockerfile)

Railway PostgreSQL
  └── DATABASE_URL → Backend
```

---

## Backend — Railway

### Erstmalig

1. Railway-Projekt erstellen: https://railway.app
2. Neuen Service "knowledge-api" anlegen
3. GitHub-Repo verbinden: `research369/369-knowledge`
4. Root-Verzeichnis: `packages/backend`
5. Build-Command: `pnpm build`
6. Start-Command: `node dist/index.js`

### Umgebungsvariablen in Railway setzen

| Variable | Wert |
|---|---|
| `DATABASE_URL` | Railway PostgreSQL Connection String |
| `OPENAI_API_KEY` | OpenAI API Key |
| `ADMIN_PASSWORD` | Sicheres Passwort (min. 16 Zeichen) |
| `JWT_SECRET` | Zufälliger String (min. 32 Zeichen) |
| `CORS_ORIGIN` | `https://wissen.369research.eu` |
| `PORT` | `3001` |

### Datenbank-Migration

Nach dem ersten Deploy:

```bash
# Railway CLI
railway run --service knowledge-api pnpm db:migrate
railway run --service knowledge-api pnpm db:seed-ontology
```

---

## Frontend — Netlify

### Erstmalig

1. Netlify-Konto: https://netlify.com
2. "Add new site" → "Import from Git"
3. GitHub-Repo: `research369/369-knowledge`
4. Build-Einstellungen (werden aus `netlify.toml` gelesen):
   - Base directory: `packages/frontend`
   - Build command: `pnpm build`
   - Publish directory: `dist`

### Umgebungsvariablen in Netlify setzen

| Variable | Wert |
|---|---|
| `VITE_API_URL` | Railway Backend URL (z.B. `https://knowledge-api.up.railway.app/api`) |

### Custom Domain

1. Netlify → Domain settings → Add custom domain
2. `wissen.369research.eu` hinzufügen
3. DNS-Eintrag bei Domain-Provider: `CNAME wissen → [netlify-subdomain].netlify.app`

---

## Automatisches Deployment

Jeder Push auf `main` triggert:
- Netlify: Frontend-Build und Deploy (~2 Min)
- Railway: Backend-Build und Deploy (~3 Min)

---

## Secrets-Checkliste

- [ ] `DATABASE_URL` in Railway gesetzt
- [ ] `OPENAI_API_KEY` in Railway gesetzt
- [ ] `ADMIN_PASSWORD` in Railway gesetzt (und sicher verwahrt)
- [ ] `JWT_SECRET` in Railway gesetzt (zufällig generiert)
- [ ] `VITE_API_URL` in Netlify gesetzt
- [ ] CORS_ORIGIN auf Frontend-Domain gesetzt

---

## Healthcheck

```bash
curl https://knowledge-api.up.railway.app/health
# → { "status": "ok", "db": "connected" }
```

---

## Rollback

```bash
# Railway — vorherigen Deploy wiederherstellen
railway rollback --service knowledge-api

# Netlify — vorherigen Deploy wiederherstellen
# Netlify Dashboard → Deploys → Deploy auswählen → "Publish deploy"
```
