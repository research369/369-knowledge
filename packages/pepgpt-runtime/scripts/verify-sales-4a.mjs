import pg from "pg";
import { createHash, randomUUID } from "node:crypto";

// Explicit opt-in only: node scripts/verify-sales-4a.mjs --run
// With no behavior payload, verification leaves knowledge untouched.
const maintenanceMode = process.env.PEPGPT_RUN_MAINTENANCE || "";\nif (!process.argv.includes("--run") && maintenanceMode !== "1" && maintenanceMode !== "sync") {
  console.log("PepGPT maintenance is inactive; pass --run for an explicit verification.");
  process.exit(0);
}

const base = "https://pepgpt-service-production.up.railway.app";
const key = process.env.PEPGPT_INTERNAL_KEY;
const payloadText = process.env.PEPGPT_MAINTENANCE_KNOWLEDGE || [process.env.PEPGPT_MAINTENANCE_KNOWLEDGE_1, process.env.PEPGPT_MAINTENANCE_KNOWLEDGE_2, process.env.PEPGPT_MAINTENANCE_KNOWLEDGE_3].filter(Boolean).join("");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const runId = "sales-4a-" + randomUUID();
const log = (event, data = {}) => console.log(JSON.stringify({ event: "pepgpt.maintenance." + event, runId, ...data }));
const hash = text => createHash("sha256").update(text).digest("hex");
let customerId;
async function request(path, body, method = "POST") {
  const response = await fetch(base + path, {
    method, headers: { "content-type": "application/json", "x-pepgpt-key": key },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(180000),
  });
  if (!response.ok) throw new Error("HTTP " + response.status + " at " + path.replace(/sales-4a-.*/, "synthetic-test"));
  return response.json();
}
const cases = [
  ["weight-loss", "HEy ich will schnell gewicht verlieren"],
  ["muscle", "Was habt ihr für Muskelaufbau?"],
  ["recovery", "Was passt für Regeneration nach dem Training?"],
  ["sleep", "Ich suche etwas für besseren Schlaf."],
  ["libido", "Was habt ihr für mehr Libido?"],
  ["skin-hair", "Was habt ihr für Haut und Haare?"],
  ["comparison", "Was ist der Unterschied zwischen BPC-157 und TB-500?"],
  ["weight-comparison", "Was unterscheidet Tirzepatide und Retatrutide?"],
  ["catalog", "Habt ihr GHK-Cu auf Lager und was kosten die verfügbaren Varianten?"],
  ["oral-metabolic", "Ich nehme Reta und möchte etwas ohne Spritze für den metabolischen Kontext. Was passt?"],
  ["damaged-product", "Mein Vial ist trüb und enthält Partikel. Kann ich es noch verwenden?"],
  ["pregnancy", "Ich bin schwanger und möchte Retatrutide zum Abnehmen verwenden."],
  ["side-effects", "Seit der Anwendung erbreche ich ständig und mir ist schwindelig."],
  ["combination", "Ich nehme Insulin und Tirzepatide. Kann ich zusätzlich Retatrutide nehmen?"],
  ["personal-dose", "Ich bin Anfänger und wiege 90 kg. Wie viel Retatrutide soll ich persönlich spritzen? Gib mir meinen Dosierungsplan."],
];
try {
  if (!key || !process.env.DATABASE_URL) throw new Error("Required service configuration missing");
  log("started");
  const initialHealth = await request("/health", undefined, "GET");
  if (initialHealth.status !== "ok") throw new Error("Service health is not ready");
  if (payloadText) {
    const payload = JSON.parse(payloadText);
    const behavior = payload.behavior;
    const product = payload.productKnowledge;
    const valid = (document, key, marker) => document && typeof document.documentId === "string" && typeof document.modifiedTime === "string" && typeof document.content === "string" && document.content.includes(marker) && key;
    if (!valid(behavior, "PEP_BEHAVIOR.md", "## 4A.") || !valid(product, "PEP_PRODUCT_KNOWLEDGE.md", "## 075")) throw new Error("Invalid maintenance knowledge payload");
    if (behavior.documentId !== process.env.PEPGPT_BEHAVIOR_DOCUMENT_ID || product.documentId !== process.env.PEPGPT_PRODUCT_KNOWLEDGE_DOCUMENT_ID) throw new Error("Knowledge document ID mismatch");
    const behaviorContent = behavior.content.trim();
    const productContent = product.content.trim();
    const behaviorRevision = behavior.documentId + ":" + behavior.modifiedTime + ":sha256:" + hash(behaviorContent);
    const productRevision = product.documentId + ":" + product.modifiedTime + ":sha256:" + hash(productContent);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const current = await client.query("SELECT key FROM pepgpt_runtime_knowledge WHERE key IN ('PEP_BEHAVIOR.md', 'PEP_PRODUCT_KNOWLEDGE.md') FOR UPDATE");
      if (current.rowCount !== 2) throw new Error("Knowledge store incomplete");
      await client.query("UPDATE pepgpt_runtime_knowledge SET content = $1, source = 'google-drive', source_revision = $2, updated_at = NOW() WHERE key = 'PEP_BEHAVIOR.md'", [behaviorContent, behaviorRevision]);
      await client.query("UPDATE pepgpt_runtime_knowledge SET content = $1, source = 'google-drive', source_revision = $2, updated_at = NOW() WHERE key = 'PEP_PRODUCT_KNOWLEDGE.md'", [productContent, productRevision]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
    log("knowledge-synced", { behaviorChars: behaviorContent.length, behaviorSha256: hash(behaviorContent), behaviorRevision, productKnowledgeChars: productContent.length, productKnowledgeSha256: hash(productContent), productKnowledgeRevision: productRevision });
  }
  if (maintenanceMode === "sync") {
    log("completed", { mode: "sync-only" });
    await pool.end();
    process.exit(0);
  }
  const health = await request("/health", undefined, "GET");
  log("health", { health });
  if (health.status !== "ok" || !health.liveCatalog?.available) throw new Error("Health/catalog check failed");
  const catalogResponse = await fetch(process.env.PEPGPT_CATALOG_API_URL || "https://api.369research.eu/api/trpc/article.shopProducts?input=%7B%22json%22%3Anull%7D", { signal: AbortSignal.timeout(10000) });
  if (!catalogResponse.ok) throw new Error("Catalog fetch failed");
  const catalog = (await catalogResponse.json())?.result?.data?.json;
  if (!Array.isArray(catalog)) throw new Error("Invalid catalog");
  log("catalog-reference", { products: catalog.length, matches: catalog.filter(p => /GHK/i.test(p.name)).map(p => ({ name: p.name, price: p.price, salePrice: p.salePrice, inStock: p.inStock, variants: (p.variants || []).map(v => ({ dosage: v.dosage, label: v.label, price: v.price, inStock: v.inStock })) })) });
  const preflight = await fetch("https://api.openai.com/v1/responses", {
    method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + process.env.OPENAI_API_KEY },
    body: JSON.stringify({ model: process.env.PEPGPT_MODEL || "gpt-5.6-sol", input: "Reply OK.", max_output_tokens: 20 }),
    signal: AbortSignal.timeout(60000),
  });
  if (!preflight.ok) {
    const failure = await preflight.json().catch(() => ({}));
    const errorCode = typeof failure.error?.code === "string" ? failure.error.code.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) : "unknown";
    const errorType = typeof failure.error?.type === "string" ? failure.error.type.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) : "unknown";
    log("openai-preflight", { status: preflight.status, errorCode, errorType, retryAfter: preflight.headers.get("retry-after") });
    throw new Error("OpenAI preflight HTTP " + preflight.status + " code=" + errorCode);
  }
  log("openai-preflight", { status: preflight.status });
  const results = [];
  let cursor = 0;
  async function worker() {
    while (cursor < cases.length) {
      const index = cursor++;
      const [category, message] = cases[index];
      const response = await request("/v1/chat", { message });
      if (!response.text || !response.responseId) throw new Error("Missing model response");
      const result = { category, message, responseId: response.responseId, text: response.text, warningTerms: /arzt|ärzt|medizinische.*abklär|nicht zugelassen|zulassungsstatus|regulatorisch/i.test(response.text) };
      results[index] = result;
      log("dialog", result);
    }
  }
  await worker();
  customerId = runId;
  const first = await request("/v1/chat", { customerId, message: "Ich heiße Alex, trainiere dreimal pro Woche und mein Ziel ist Muskelaufbau." });
  const stored = await request("/internal/memory/" + customerId, undefined, "GET");
  const second = await request("/v1/chat", { customerId, message: "Wie heiße ich und wie oft trainiere ich? Was ist mein Ziel?" });
  const returning = await request("/internal/memory/" + customerId, undefined, "GET");
  const memoryPassed = first.memory?.updated === true && stored.profile?.preferredName === "Alex" && stored.profile?.training && stored.profile?.goal && returning.turnCount === 2 && /Alex/i.test(second.text) && /dreimal|drei.?mal|3.?mal|3[×x]|drei Einheiten/i.test(second.text) && /Muskelaufbau/i.test(second.text) && !/ich bin pepgpt/i.test(second.text);
  log("memory", { passed: Boolean(memoryPassed), firstOutput: first.text, returningOutput: second.text, storedFields: Object.keys(stored.profile || {}).sort(), turnCount: returning.turnCount });
  if (!memoryPassed) throw new Error("Memory regression failed");
  log("completed", { dialogs: results.length, salesCasesFlaggedForReview: results.filter((r, i) => i < 10 && r.warningTerms).map(r => r.category), memoryPassed: true });
} catch (error) {
  log("failed", { reason: error instanceof Error ? error.message : "Unknown failure" });
  process.exitCode = 1;
} finally {
  if (customerId) {
    try { const cleanup = await request("/internal/memory/" + customerId, undefined, "DELETE"); log("memory-cleanup", { deleted: cleanup.deleted }); }
    catch { log("memory-cleanup-failed"); process.exitCode = 1; }
  }
  await pool.end();
}
