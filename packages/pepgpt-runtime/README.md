# PepGPT Runtime

## Customer memory

`POST /v1/chat` remains backwards compatible. To enable long-term memory, pass a stable, pseudonymous `customerId` in addition to `message`, `history`, and `context`:

```json
{
  "customerId": "shop-user_12345",
  "message": "Ich trainiere dreimal pro Woche und mein Stresslevel ist hoch."
}
```

When `customerId` is omitted, PepGPT does not read or write customer memory. The caller must never use an email address, phone number, name, or another directly identifying value as `customerId`.

PepGPT stores only allowlisted profile facts explicitly stated by the customer. It does not store full chat messages, contact details, addresses, payment data, secrets, or inferred diagnoses. New explicit statements replace older profile facts.

The internal-key-protected endpoints below support access and deletion:

- `GET /internal/memory/:customerId`
- `DELETE /internal/memory/:customerId`

The first identified turn receives the PepGPT introduction. Returning customers do not. Responses ask at most one materially relevant follow-up question and must not request height, weight, occupation, children, stress, training, or nutrition for simple availability and product-information questions.

## Batch evaluations

The bundled `evals/new-customer-questions.json` suite contains 148 realistic German customer questions grouped by topic. It runs every case through the same PepGPT pipeline and stores the complete results in `pepgpt_eval_runs`.

Start the bundled suite without exposing credentials:

- One-time deployment test: set `PEPGPT_BATCH_EVAL_ON_BOOT=1` for one deployment, then remove it.
- Internal authenticated test: `POST /internal/evals` with either an empty body for the bundled suite or `{ "suite": "name", "cases": [...] }` for up to 200 custom cases. It returns `202` with a run ID immediately and continues in the background.
- Read a stored result: `GET /internal/evals/:runId`.

Concurrency defaults to 3 and is capped at 5 (`PEPGPT_BATCH_EVAL_CONCURRENCY`). `PEPGPT_BATCH_EVAL_LIMIT` can restrict a run while keeping the full suite unchanged.

The runtime contains approved static shipping facts. It reads public product names, prices, sale prices, variants and availability from the existing 369 Research shop API with a short cache and a five-second fail-closed timeout. It never exposes numerical warehouse stock. Payment methods, order state, customer data and discounts are used only when current authenticated commerce data is supplied. Personal commerce data requires authenticated customer context.

The catalog source defaults to the existing read-only `article.shopProducts` endpoint and can be overridden with `PEPGPT_CATALOG_API_URL`. `PEPGPT_CATALOG_CACHE_MS` defaults to 30 seconds and is constrained to 10–300 seconds.
