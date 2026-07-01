/**
 * webhook.service.ts
 *
 * Schritt 4 des Architektur-Manifests:
 * Webhook Auto-Sync — wenn lifecycle_status von approved auf published wechselt,
 * werden alle aktiven Webhooks für Shop, Academy und n8n ausgelöst.
 *
 * Unterstützte Events:
 *   - entity.published   → lifecycle_status: approved → published
 *   - entity.updated     → jeder PATCH
 *   - entity.archived    → status: archived
 *   - stack.published    → Stack-Status → published
 */

import { db } from "../db/index.js";
import { sql } from "drizzle-orm";

export interface WebhookPayload {
  event: string;
  entityId: string;
  entitySlug?: string;
  entityType?: string;
  entityName?: string;
  timestamp: string;
  data?: Record<string, any>;
}

/**
 * Alle aktiven Webhooks für ein bestimmtes Event abrufen und feuern.
 * Fehler werden geloggt aber nicht geworfen — Webhook-Fehler sollen
 * den Haupt-Request nicht blockieren.
 */
export async function fireWebhooks(
  event: string,
  payload: WebhookPayload
): Promise<void> {
  try {
    // Aktive Webhooks abrufen die dieses Event abonniert haben
    const webhooks = await db.execute(sql`
      SELECT id, name, target_system, url, secret, events
      FROM webhooks
      WHERE active = true
        AND (
          events @> ${JSON.stringify([event])}::jsonb
          OR events @> '["*"]'::jsonb
        )
    `) as any[];

    if (!webhooks || webhooks.length === 0) {
      return;
    }

    const body = JSON.stringify({
      ...payload,
      source: "369-knowledge-os",
      version: "1.0",
    });

    // Alle Webhooks parallel feuern
    const results = await Promise.allSettled(
      webhooks.map(async (wh: any) => {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "X-369-Event": event,
          "X-369-Timestamp": payload.timestamp,
        };

        // HMAC-Signatur wenn Secret vorhanden
        if (wh.secret) {
          const { createHmac } = await import("crypto");
          const sig = createHmac("sha256", wh.secret).update(body).digest("hex");
          headers["X-369-Signature"] = `sha256=${sig}`;
        }

        const response = await fetch(wh.url, {
          method: "POST",
          headers,
          body,
          signal: AbortSignal.timeout(10000), // 10s Timeout
        });

        // Trigger-Count und last_triggered_at aktualisieren
        await db.execute(sql`
          UPDATE webhooks
          SET
            last_triggered_at = NOW(),
            trigger_count = trigger_count + 1,
            last_error = ${response.ok ? null : `HTTP ${response.status}`},
            updated_at = NOW()
          WHERE id = ${wh.id}
        `);

        if (!response.ok) {
          console.warn(`[webhook.service] ${wh.name} (${wh.target_system}) → HTTP ${response.status}`);
        } else {
          console.log(`[webhook.service] ✓ ${wh.name} (${wh.target_system}) → ${event}`);
        }

        return { id: wh.id, name: wh.name, status: response.status, ok: response.ok };
      })
    );

    const failed = results.filter(r => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok));
    if (failed.length > 0) {
      console.warn(`[webhook.service] ${failed.length}/${webhooks.length} webhooks failed for event: ${event}`);
    }
  } catch (err: any) {
    // Webhook-Fehler sollen nie den Haupt-Request blockieren
    console.error(`[webhook.service] Error firing webhooks for ${event}:`, err?.message);
  }
}

/**
 * Convenience-Wrapper: Entity published event
 */
export async function onEntityPublished(entity: {
  id: string;
  slug?: string;
  type?: string;
  canonicalName?: string;
  [key: string]: any;
}): Promise<void> {
  await fireWebhooks("entity.published", {
    event: "entity.published",
    entityId: entity.id,
    entitySlug: entity.slug,
    entityType: entity.type,
    entityName: entity.canonicalName,
    timestamp: new Date().toISOString(),
    data: {
      status: "published",
      publishedAt: entity.publishedAt ?? new Date().toISOString(),
      contentCompleteness: entity.contentCompleteness,
      goldstandardApproved: entity.goldstandardApproved,
    },
  });
}

/**
 * Convenience-Wrapper: Entity updated event
 */
export async function onEntityUpdated(entity: {
  id: string;
  slug?: string;
  type?: string;
  canonicalName?: string;
  version?: number;
  [key: string]: any;
}): Promise<void> {
  await fireWebhooks("entity.updated", {
    event: "entity.updated",
    entityId: entity.id,
    entitySlug: entity.slug,
    entityType: entity.type,
    entityName: entity.canonicalName,
    timestamp: new Date().toISOString(),
    data: {
      version: entity.version,
      updatedAt: new Date().toISOString(),
    },
  });
}
