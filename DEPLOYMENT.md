# 369 Knowledge OS — Deployment Guide

Dieses System läuft vollständig eigenständig ohne externe Abhängigkeiten außer:
- Railway (Backend + PostgreSQL)
- Netlify (Frontend)
- OpenAI API (Knowledge Factory)

---

## Architektur

```
GitHub Repository
    ↓ auto-deploy
Railway Backend (Node.js + Express)
    ↓ PostgreSQL
Railway Database
    ↓ REST API
Netlify Frontend (React/Vite)
```

---

## Railway Backend Setup

### 1. Projekt anlegen
1. [railway.com](https://railway.com) → New Project → Deploy from GitHub
2. Repository: `369-research/369-knowledge`
3. Root Directory: `packages/backend`

### 2. PostgreSQL hinzufügen
1. Railway Dashboard → Add Service → Database → PostgreSQL
2. `DATABASE_URL` wird automatisch als Variable gesetzt

### 3. Environment Variables setzen
Railway Dashboard → Backend-Service → Variables → New Variable

**Pflichtfelder:**

| Variable | Wert | Hinweis |
|---|---|---|
| `DATABASE_URL` | auto | Wird von Railway gesetzt |
| `ADMIN_PASSWORD` | `369Research2024!` | Sicheres Passwort verwenden |
| `JWT_SECRET` | random 32+ chars | Zufälligen String generieren |
| `OPENAI_API_KEY` | `sk-...` | **Niemals im Chat posten** |
| `LLM_PROVIDER` | `openai` | |
| `OPENAI_MODEL` | `gpt-4o-mini` | oder `gpt-4o` für höchste Qualität |
| `FACTORY_LLM_ENABLED` | `true` | |
| `NODE_ENV` | `production` | |
| `CORS_ORIGIN` | Netlify-URL | z.B. `https://369-knowledge.netlify.app` |

### 4. Deploy
- Jeder Push auf `main` triggert automatisch einen neuen Deploy
- Deploy-Status: Railway Dashboard → Deployments

---

## Netlify Frontend Setup

### 1. Projekt anlegen
1. [netlify.com](https://netlify.com) → Add New Site → Import from Git
2. Repository: `369-research/369-knowledge`
3. Base Directory: `packages/frontend`
4. Build Command: `pnpm build`
5. Publish Directory: `dist`

### 2. Environment Variables
Netlify Dashboard → Site Settings → Environment Variables

| Variable | Wert |
|---|---|
| `VITE_API_URL` | Railway Backend URL (z.B. `https://backend-production-xxxx.up.railway.app`) |

---

## API Endpoints

### Öffentlich
```
GET  /api/health                    → System-Status
GET  /api/entities                  → Alle Entities
GET  /api/entities/:slug            → Entity-Detail
GET  /api/compound/:slug            → Compound-View (mit ?layer=L1&system=shop)
GET  /api/stacks                    → Alle Stacks
GET  /api/stacks/:id                → Stack-Detail mit Compounds
GET  /api/agent/query               → Semantische Suche (für KI-Agenten)
GET  /api/agent/context/:slug       → Rollen-spezifischer Kontext
```

### Admin (x-admin-token Header oder Cookie)
```
POST /api/admin/login               → Admin-Login
POST /api/factory/generate          → Neue Entity generieren
POST /api/factory/generate-for/:id  → Bestehende Entity befüllen
GET  /api/factory/queue             → Review-Queue
POST /api/factory/approve/:id       → Entity genehmigen
POST /api/factory/publish/:id       → Entity veröffentlichen
PATCH /api/entities/:id             → Entity aktualisieren
POST /api/entities/:id/publish      → Entity publishen
PATCH /api/stacks/:id               → Stack aktualisieren
```

---

## Admin-Authentifizierung

```bash
# Login
TOKEN=$(curl -s -X POST https://your-backend.railway.app/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"password":"YOUR_ADMIN_PASSWORD"}' | jq -r '.token')

# Authenticated Request
curl -H "x-admin-token: $TOKEN" https://your-backend.railway.app/api/factory/queue
```

---

## Keine Manus-Abhängigkeit

Dieses System läuft vollständig ohne Manus:
- Kein Manus Built-in LLM
- Kein Manus Agent
- Kein Manus OAuth
- Kein Manus Webhook
- Kein Manus Storage

Manus wurde ausschließlich als Entwicklungswerkzeug genutzt.
