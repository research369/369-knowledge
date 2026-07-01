# 369 Knowledge OS — Knowledge Factory Setup

Die Knowledge Factory generiert automatisch vollständige Goldstandard-Entities aus einem Compound-Namen.

---

## Voraussetzungen

1. `OPENAI_API_KEY` in Railway gesetzt (siehe DEPLOYMENT.md)
2. `FACTORY_LLM_ENABLED=true`
3. Admin-Token vorhanden

---

## Factory-Workflow

```
POST /api/factory/generate
    ↓ LLM generiert Entity-Daten
    ↓ Entity wird angelegt (status: pending_review)
    ↓ 8 Content Blocks (L1–L4)
    ↓ Relations (Knowledge Graph)
    ↓ Sources mit Evidence Level
    ↓ Agent-Felder (Sales Pitch, FAQ, Research Context)
    ↓ Confidence Score berechnet
    
GET /api/factory/queue
    ↓ Review-Queue anzeigen
    
POST /api/factory/approve/:id
    ↓ Entity genehmigen (status: approved)
    
POST /api/factory/publish/:id
    ↓ Entity veröffentlichen (status: published)
    ↓ Webhooks werden gefeuert (Shop, Academy, n8n)
```

---

## Beispiel: MOTS-c generieren

```bash
# 1. Admin-Login
TOKEN=$(curl -s -X POST https://your-backend.railway.app/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"password":"YOUR_ADMIN_PASSWORD"}' | jq -r '.token')

# 2. Entity generieren
ENTITY_ID=$(curl -s -X POST https://your-backend.railway.app/api/factory/generate \
  -H "Content-Type: application/json" \
  -H "x-admin-token: $TOKEN" \
  -d '{
    "name": "MOTS-c",
    "type": "compound",
    "sources": [
      "Lee C et al. (2015). MOTS-c: A mitochondrial-derived peptide regulating muscle and fat metabolism. Cell Metabolism.",
      "Reynolds JC et al. (2021). MOTS-c is an exercise-induced mitochondrial-encoded regulator of age-dependent physical decline and muscle homeostasis. Nature Communications."
    ]
  }' | jq -r '.entity.id')

# 3. Review-Queue prüfen
curl -H "x-admin-token: $TOKEN" https://your-backend.railway.app/api/factory/queue

# 4. Genehmigen
curl -s -X POST https://your-backend.railway.app/api/factory/approve/$ENTITY_ID \
  -H "x-admin-token: $TOKEN"

# 5. Veröffentlichen
curl -s -X POST https://your-backend.railway.app/api/factory/publish/$ENTITY_ID \
  -H "x-admin-token: $TOKEN"

# 6. Ergebnis prüfen
curl https://your-backend.railway.app/api/compound/mots-c
```

---

## Factory-Output (Goldstandard)

Jede generierte Entity enthält:

| Komponente | Inhalt |
|---|---|
| **Entity** | Name, Slug, Typ, Lifecycle-Status, SEO-Felder |
| **Content Blocks** | 8 Blocks (L1 Basis, L2 Mechanismus, L3 Studien, L4 Protokoll) |
| **Relations** | 8–15 Knowledge-Graph-Verbindungen |
| **Sources** | 3–5 wissenschaftliche Quellen mit Evidence Level |
| **Agent-Felder** | Sales Pitch, FAQ (6 Einträge), Research Context, Disclaimer |
| **Confidence Score** | Automatisch berechnet (0.0–1.0) |

---

## LLM-Provider-Konfiguration

```env
LLM_PROVIDER=openai          # Standard: openai
OPENAI_API_KEY=sk-...        # Niemals committen!
OPENAI_MODEL=gpt-4o-mini     # oder gpt-4o für höchste Qualität
FACTORY_LLM_ENABLED=true     # false = Factory deaktiviert, System läuft weiter
```

### Kosten-Schätzung
- `gpt-4o-mini`: ~$0.01–0.05 pro Entity
- `gpt-4o`: ~$0.20–0.50 pro Entity

### Provider wechseln
Der `llm-provider.service.ts` ist abstrakt aufgebaut. Um einen anderen Provider zu nutzen:
1. `LLM_PROVIDER=anthropic` setzen
2. `ANTHROPIC_API_KEY=...` setzen
3. `invokeLLM()` in `llm-provider.service.ts` erweitern

---

## Fehlerbehandlung

| Fehler | Ursache | Lösung |
|---|---|---|
| `Factory LLM disabled` | `FACTORY_LLM_ENABLED=false` | Variable auf `true` setzen |
| `OpenAI API key not configured` | Key fehlt oder ist Platzhalter | Key in Railway setzen |
| `Invalid API key` | Falscher Key | Key in Railway aktualisieren |
| `Rate limit exceeded` | Zu viele Requests | Warten oder Tier upgraden |

---

## Sicherheitshinweise

- `OPENAI_API_KEY` **niemals** im Chat, in Commits oder Logs posten
- Key ausschließlich in Railway Variables setzen
- Regelmäßig rotieren (alle 90 Tage empfohlen)
- Usage-Limits in OpenAI Dashboard setzen
