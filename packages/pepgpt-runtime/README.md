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
