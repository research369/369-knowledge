import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
try {
  const { rows } = await pool.query(
    "SELECT run_id, suite, status, total, completed, failed, results, completed_at FROM pepgpt_eval_runs ORDER BY created_at DESC LIMIT 1"
  );
  const run = rows[0];
  if (!run) throw new Error("No evaluation run found");
  const results = Array.isArray(run.results) ? run.results : [];
  const groups = {};
  for (const item of results) {
    const key = item.group || "general";
    const entry = groups[key] || (groups[key] = { total: 0, ok: 0, flagged: 0, averageChars: 0, averageScore: 0 });
    entry.total += 1;
    if (item.status === "ok") entry.ok += 1;
    if (item.evaluation?.passed === false) entry.flagged += 1;
    entry.averageChars += typeof item.output === "string" ? item.output.length : 0;
    entry.averageScore += Number(item.evaluation?.score || 0);
  }
  for (const entry of Object.values(groups)) {
    entry.averageChars = Math.round(entry.averageChars / entry.total);
    entry.averageScore = Math.round(entry.averageScore / entry.total);
  }
  const selected = new Set([1, 2, 4, 5, 8, 15, 18, 21, 22, 24, 25, 31, 35, 36, 43, 44, 45, 46, 47, 48, 50, 51, 54, 61, 63, 64, 65, 66, 67, 68, 69, 70]);
  console.log("PEPGPT_EVAL_REPORT_BEGIN");
  console.log("PEPGPT_EVAL_SUMMARY " + JSON.stringify({ runId: run.run_id, suite: run.suite, status: run.status, total: run.total, completed: run.completed, failed: run.failed, groups }));
  for (const item of results.filter((row) => selected.has(row.id))) {
    console.log("PEPGPT_EVAL_SAMPLE " + JSON.stringify({ id: item.id, group: item.group, category: item.category, question: item.message, score: item.evaluation?.score, passed: item.evaluation?.passed, answer: typeof item.output === "string" ? item.output.slice(0, 1800) : item.detail || "" }));
  }
  const reviewQuery = await pool.query("SELECT review_id, run_id, status, total, completed, failed, results, completed_at FROM pepgpt_eval_reviews ORDER BY created_at DESC LIMIT 1");
  const review = reviewQuery.rows[0];
  if (review) {
    const reviewResults = Array.isArray(review.results) ? review.results : [];
    const byGroup = {};
    for (const item of reviewResults) {
      const group = item.group || "general";
      const entry = byGroup[group] || (byGroup[group] = { total: 0, revision: 0, relevance: 0, clarity: 0, sales: 0, catalog: 0, safety: 0 });
      entry.total += 1;
      if (item.review?.verdict === "needs_revision") entry.revision += 1;
      for (const key of ["relevance", "clarity", "sales", "catalog", "safety"]) entry[key] += Number(item.review?.[key] || 0);
    }
    for (const entry of Object.values(byGroup)) for (const key of ["relevance", "clarity", "sales", "catalog", "safety"]) entry[key] = Number((entry[key] / entry.total).toFixed(2));
    console.log("PEPGPT_QUALITY_SUMMARY " + JSON.stringify({ reviewId: review.review_id, runId: review.run_id, status: review.status, total: review.total, completed: review.completed, failed: review.failed, groups: byGroup }));
    for (const item of reviewResults.filter((row) => row?.review?.verdict === "needs_revision")) console.log("PEPGPT_QUALITY_FLAG " + JSON.stringify(item));
    for (const item of reviewResults.filter((row) => row?.status === "failed").slice(0, 5)) console.log("PEPGPT_QUALITY_ERROR " + JSON.stringify(item));
  }
  console.log("PEPGPT_EVAL_REPORT_END");
} finally {
  await pool.end();
}
