# 369 Knowledge OS — MASTER CONTEXT
**Version 1.0 | Frozen: 08.07.2026**

Dieses Dokument ist der primäre Einstiegspunkt für jeden Agenten oder Entwickler, der das System übernimmt. Es fasst alle kritischen Kontextinformationen zusammen.

---

## System-Identität

Das 369 Knowledge OS ist das wissenschaftliche Fundament der 369 Research Plattform. Es ist keine Webseite. Es ist ein semantisches Betriebssystem für Wissen über Research Compounds, Peptide und biologische Optimierung.

**Betreiber:** 369 Research / BEDO Holding GmbH, Sassenberg (NRW)  
**Primäre Domain:** https://portal.369research.eu  
**Admin-Panel:** https://portal.369research.eu/admin  
**Backend API:** https://backend-production-77f3.up.railway.app/api  

---

## Infrastruktur

| Komponente | Plattform | URL |
|---|---|---|
| Frontend | Netlify | portal.369research.eu |
| Backend | Railway | backend-production-77f3.up.railway.app |
| Datenbank | Railway PostgreSQL | via DATABASE_URL env |
| DNS | Njalla | 369research.eu |
| CI/CD | GitHub Actions | .github/workflows/deploy.yml |

---

## Repository-Struktur

```
369-knowledge/
├── packages/
│   ├── backend/          Express + TypeScript + Drizzle ORM
│   │   ├── src/
│   │   │   ├── routes/   Alle API-Router
│   │   │   ├── services/ Learning Runtime, Ontology
│   │   │   ├── db/       Schema + Migrations
│   │   │   └── middleware/ Auth (requireAdmin, requireApiKey)
│   └── frontend/         React + Vite + Tailwind
│       ├── src/
│       │   ├── pages/    Portal, EntityDetail, Glossar, Admin
│       │   └── components/ Navigation, etc.
│       └── public/       robots.txt, sitemap (statisch)
├── docs/                 API.md, AGENTS.md, DEPLOY.md
├── ARCHITECTURE.md       Systemarchitektur (verbindlich)
├── KNOWLEDGE_OS_CONTRACT.md  Agent-Verhalten (verbindlich)
├── GOLDSTANDARD.md       Content-Qualitätsstandards
├── FACTORY_SETUP.md      Content Factory Betrieb
├── SECURITY.md           Sicherheitsrichtlinien
├── MASTER_CONTEXT.md     Dieses Dokument
└── PROJECT_RULES.md      Entwicklungsregeln
```

---

## Kritische Regeln (Architecture Frozen)

1. **Keine neuen Tabellen** ohne explizite Freigabe
2. **Keine neuen Router** ohne explizite Freigabe
3. **Kein Hardcoding** von Secrets, URLs oder Konfiguration
4. **Alle Write-Endpoints** müssen `requireAdmin` oder Agent-API-Key-Auth haben
5. **Learning Pipeline** schreibt auf Filesystem — bei Aktivierung in PostgreSQL migrieren
6. **Suche** nutzt ILIKE — bei >5.000 Entities auf tsvector migrieren
7. **Deployments** immer via Git-Push (Backend → Railway auto) und Netlify-Deploy-Script

---

## Umgebungsvariablen (Railway Backend)

| Variable | Zweck |
|---|---|
| `DATABASE_URL` | PostgreSQL Connection String |
| `JWT_SECRET` | Admin-Session Signing |
| `ADMIN_SECRET` | x-admin-key für Runtime-Endpoints |
| `OPENAI_API_KEY` | Content Factory AI-Generierung |

---

## Bekannte Architektur-Risiken (dokumentiert, nicht kritisch für V1)

1. Learning Pipeline: Filesystem-abhängig → bei Aktivierung in DB migrieren
2. Suche: ILIKE ohne Index → bei >5.000 Entities GIN-Index hinzufügen
3. API ohne Versionierung → bei erstem externen Konsumenten /v2 einführen

---

## Nächste operative Schritte (Betriebsmodus)

- Content-Pipeline starten (Entities mit AI-Factory befüllen)
- Google Search Console verifizieren + Sitemap einreichen
- Railway PostgreSQL Backup verifizieren
- PepGPT / SalesGPT Agent-API-Keys erstellen
