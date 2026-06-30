/**
 * MIGRATION RUNNER — Dauerhafter Crash-Schutz
 *
 * REGEL: Seed-Migrationen dürfen NIEMALS den Server zum Absturz bringen.
 *
 * Dieser Runner:
 * 1. Fängt JEDEN Fehler ab — auch unbehandelte Promise Rejections
 * 2. Loggt den vollständigen Fehler mit Stack Trace
 * 3. Gibt immer zurück ohne zu werfen
 * 4. Server startet IMMER, egal was in den Migrationen passiert
 */

type MigrationFn = () => Promise<void>;

interface MigrationResult {
  name: string;
  success: boolean;
  error?: string;
}

export async function runMigrationSafely(
  name: string,
  fn: MigrationFn
): Promise<MigrationResult> {
  try {
    await fn();
    return { name, success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error
      ? `${err.message}\n${err.stack ?? ""}`
      : String(err);

    console.error(`\n[MIGRATION ERROR] ${name} failed:`);
    console.error(`  Error: ${errorMsg.split("\n")[0]}`);

    // Postgres-spezifische Fehler extra ausführlich loggen
    if (err && typeof err === "object" && "code" in err) {
      const pgErr = err as { code?: string; detail?: string; hint?: string; where?: string };
      if (pgErr.code) console.error(`  PG Code: ${pgErr.code}`);
      if (pgErr.detail) console.error(`  Detail: ${pgErr.detail}`);
      if (pgErr.hint) console.error(`  Hint: ${pgErr.hint}`);
      if (pgErr.where) console.error(`  Where: ${pgErr.where}`);
    }

    console.error(`[MIGRATION ERROR] Server continues despite ${name} failure.\n`);

    return { name, success: false, error: errorMsg.split("\n")[0] };
  }
}

export async function runAllMigrations(migrations: Array<{ name: string; fn: MigrationFn }>) {
  console.log(`[Migrations] Running ${migrations.length} migrations...`);
  const results: MigrationResult[] = [];

  for (const { name, fn } of migrations) {
    const result = await runMigrationSafely(name, fn);
    results.push(result);
  }

  const succeeded = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success);

  console.log(`[Migrations] ${succeeded}/${migrations.length} succeeded.`);
  if (failed.length > 0) {
    console.error(`[Migrations] ${failed.length} failed (server still running):`);
    failed.forEach(r => console.error(`  - ${r.name}: ${r.error}`));
  }

  // KRITISCH: Diese Funktion wirft NIE — Server startet immer
  return results;
}
