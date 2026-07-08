# 369 Knowledge OS — SECURITY
**Version 1.0 | Stand: 08.07.2026**

---

## Authentifizierung

Das System verwendet zwei Authentifizierungsebenen:

**Admin-Auth** (`requireAdmin` Middleware) schützt alle schreibenden Operationen. Die Middleware validiert ein JWT-Token aus dem `Authorization: Bearer` Header. Tokens werden mit `JWT_SECRET` (Railway-Umgebungsvariable) signiert und haben eine begrenzte Laufzeit.

**Agent-API-Key-Auth** schützt Agenten-spezifische Endpoints. Jeder Agent erhält einen einmalig generierten Key (`369k_...`), dessen SHA-256-Hash in der Datenbank gespeichert wird. Der Klartext-Key wird nur einmalig bei der Erstellung zurückgegeben und danach nicht mehr angezeigt.

**Admin-Secret** (`ADMIN_SECRET` Umgebungsvariable) schützt Runtime-Endpoints (`/api/runtime/learning/invalidate`, `/api/runtime/learning/process-queue`) über den Header `x-admin-key`.

---

## Geschützte Endpoints

Alle schreibenden Endpoints sind durch `requireAdmin` oder Agent-Key-Auth geschützt:

| Router | Geschützte Methoden |
|---|---|
| `entities.router.ts` | POST, PATCH (alle) |
| `agents.router.ts` | POST /keys, PUT /keys/:id, DELETE /keys/:id, PUT /suggestions/:id/review |
| `prompts.router.ts` | POST, PUT, DELETE |
| `sources.router.ts` | POST, PUT, DELETE |
| `runtime.router.ts` | POST /learning/invalidate, POST /learning/process-queue |
| `factory.router.ts` | POST /generate-for/:id, POST /approve/:id, POST /publish/:id |

---

## Umgebungsvariablen

Alle Secrets werden ausschließlich als Railway-Umgebungsvariablen verwaltet. Kein Secret darf im Code, in Git-History oder in Log-Ausgaben erscheinen.

| Variable | Zweck | Rotation |
|---|---|---|
| `JWT_SECRET` | Admin-Session Signing | Bei Verdacht sofort rotieren |
| `ADMIN_SECRET` | Runtime-Endpoint-Schutz | Bei Verdacht sofort rotieren |
| `OPENAI_API_KEY` | Content Factory | Monatlich prüfen |
| `DATABASE_URL` | PostgreSQL | Nur bei DB-Migration ändern |

---

## Rate Limiting

Das Backend hat Rate Limiting via `express-rate-limit`:
- Standard-Endpoints: 100 Requests/15 Minuten pro IP
- Agent-Endpoints: Individuell pro Agent-Key konfigurierbar (Standard: 1.000/Tag)

---

## CORS

CORS ist auf explizit erlaubte Origins beschränkt. Erlaubte Origins:
- `https://portal.369research.eu`
- `https://369research.eu`
- `http://localhost:5173` (Development)

---

## Bekannte Risiken und Maßnahmen

**Kein HTTPS-Enforcement im Backend:** Railway erzwingt HTTPS auf der Proxy-Ebene. Direktzugriff auf den internen Port ist nicht möglich.

**Learning Pipeline Filesystem:** Die Learning-Pipeline schreibt temporäre Dateien auf das Railway-Filesystem. Bei einem Deploy-Neustart gehen diese verloren. Maßnahme: Learning-Queue in PostgreSQL migrieren, bevor die Pipeline produktiv genutzt wird.

**Keine 2FA für Admin:** Das Admin-Panel ist ausschließlich durch JWT geschützt. Empfehlung: IP-Whitelist in Railway-Firewall einrichten.

---

## Incident Response

Bei Verdacht auf Kompromittierung:
1. `JWT_SECRET` in Railway sofort rotieren (invalidiert alle aktiven Sessions)
2. `ADMIN_SECRET` rotieren
3. Alle Agent-API-Keys in der Datenbank deaktivieren: `UPDATE agent_api_keys SET active = false`
4. Railway-Deploy triggern
5. Logs auf ungewöhnliche Zugriffe prüfen: `GET /api/agents/logs`
