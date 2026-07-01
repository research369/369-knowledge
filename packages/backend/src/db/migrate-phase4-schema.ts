/**
 * Phase 4 — Knowledge OS Schema-Erweiterungen
 *
 * Ziel: Das Knowledge OS wird das zentrale Betriebssystem von 369 Research.
 * Alle 9 Downstream-Systeme müssen aus einer gemeinsamen Datenbasis bedient werden.
 *
 * Downstream-Systeme:
 * 1. Website (Knowledge Pages, SEO, Sitemap)
 * 2. Shop (Produktbeschreibungen, Bundles, Upsells)
 * 3. Academy (Module, Protokolle, Lernpfade)
 * 4. KI-Agenten (Sales, Support, PepGPT, Content, SEO, Research, Medical)
 * 5. Content-System (Social Posts, Newsletter, Blog, Vergleiche)
 * 6. SEO (Structured Data, Canonical URLs, Sitemaps, Hreflang)
 * 7. Interne Tools (Admin, Review, Qualitätssicherung)
 * 8. CRM (Kundensegmente, Produktinteressen, Empfehlungen)
 * 9. Zukünftige Apps (API-Keys, Webhooks, Versionierung)
 *
 * ADDITIVE MIGRATION — keine bestehenden Felder werden verändert.
 * Alle neuen Tabellen und Felder werden mit IF NOT EXISTS / ON CONFLICT DO NOTHING gesichert.
 */

import { db } from "./index.js";
import { sql } from "drizzle-orm";

export async function runPhase4SchemaMigration() {
  try {
    // Sentinel: Prüfe ob Migration bereits gelaufen
    const check = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'stacks'
      ) as exists
    `);
    const alreadyRun = (check as any)[0]?.exists === true;
    if (alreadyRun) {
      console.log("[Phase 4 Schema] Already complete — skipping");
      return;
    }

    console.log("[Phase 4 Schema] Starting schema extensions...");

    // ═══════════════════════════════════════════════════════════════════════
    // BLOCK 1: ENTITIES — Neue Felder für alle 9 Systeme
    // ═══════════════════════════════════════════════════════════════════════

    // 1a. SHOP-FELDER — Produktbeschreibungen, Preislogik, Bundle-Hinweise
    await db.execute(sql`
      ALTER TABLE entities
        ADD COLUMN IF NOT EXISTS shop_headline VARCHAR(200),
        ADD COLUMN IF NOT EXISTS shop_subheadline VARCHAR(300),
        ADD COLUMN IF NOT EXISTS shop_bullet_points JSONB NOT NULL DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS shop_use_case_primary VARCHAR(300),
        ADD COLUMN IF NOT EXISTS shop_use_case_secondary JSONB NOT NULL DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS shop_target_audience JSONB NOT NULL DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS shop_contraindications JSONB NOT NULL DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS shop_storage_instructions VARCHAR(300),
        ADD COLUMN IF NOT EXISTS shop_legal_disclaimer TEXT,
        ADD COLUMN IF NOT EXISTS shop_badge_labels JSONB NOT NULL DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS bundle_synergy_ids JSONB NOT NULL DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS upsell_entity_ids JSONB NOT NULL DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS cross_sell_entity_ids JSONB NOT NULL DEFAULT '[]'
    `);
    console.log("[Phase 4 Schema] ✓ Shop fields added to entities");

    // 1b. ACADEMY-FELDER — Lernziele, Schwierigkeitsgrad, Voraussetzungen
    await db.execute(sql`
      ALTER TABLE entities
        ADD COLUMN IF NOT EXISTS academy_learning_goals JSONB NOT NULL DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS academy_prerequisites JSONB NOT NULL DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS academy_difficulty VARCHAR(50) DEFAULT 'intermediate',
        ADD COLUMN IF NOT EXISTS academy_estimated_time_minutes INTEGER,
        ADD COLUMN IF NOT EXISTS academy_module_order INTEGER,
        ADD COLUMN IF NOT EXISTS academy_is_featured BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS academy_video_url TEXT,
        ADD COLUMN IF NOT EXISTS academy_quiz_ids JSONB NOT NULL DEFAULT '[]'
    `);
    console.log("[Phase 4 Schema] ✓ Academy fields added to entities");

    // 1c. CONTENT-FELDER — Social Posts, Newsletter, Vergleiche
    await db.execute(sql`
      ALTER TABLE entities
        ADD COLUMN IF NOT EXISTS content_hook_30s TEXT,
        ADD COLUMN IF NOT EXISTS content_hook_60s TEXT,
        ADD COLUMN IF NOT EXISTS content_tiktok_angle TEXT,
        ADD COLUMN IF NOT EXISTS content_instagram_caption TEXT,
        ADD COLUMN IF NOT EXISTS content_newsletter_teaser TEXT,
        ADD COLUMN IF NOT EXISTS content_comparison_ids JSONB NOT NULL DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS content_stack_position VARCHAR(100),
        ADD COLUMN IF NOT EXISTS content_viral_fact TEXT,
        ADD COLUMN IF NOT EXISTS content_misconception TEXT
    `);
    console.log("[Phase 4 Schema] ✓ Content fields added to entities");

    // 1d. AGENT-FELDER — Kontext für alle KI-Agenten
    await db.execute(sql`
      ALTER TABLE entities
        ADD COLUMN IF NOT EXISTS agent_sales_pitch TEXT,
        ADD COLUMN IF NOT EXISTS agent_support_faq JSONB NOT NULL DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS agent_research_context TEXT,
        ADD COLUMN IF NOT EXISTS agent_medical_disclaimer TEXT,
        ADD COLUMN IF NOT EXISTS agent_confidence_score REAL DEFAULT 0.8,
        ADD COLUMN IF NOT EXISTS agent_last_reviewed_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS agent_review_priority INTEGER DEFAULT 0
    `);
    console.log("[Phase 4 Schema] ✓ Agent fields added to entities");

    // 1e. SEO-FELDER — Structured Data, Hreflang, Open Graph
    await db.execute(sql`
      ALTER TABLE entities
        ADD COLUMN IF NOT EXISTS seo_og_title VARCHAR(200),
        ADD COLUMN IF NOT EXISTS seo_og_description VARCHAR(300),
        ADD COLUMN IF NOT EXISTS seo_og_image_url TEXT,
        ADD COLUMN IF NOT EXISTS seo_twitter_card VARCHAR(50) DEFAULT 'summary_large_image',
        ADD COLUMN IF NOT EXISTS seo_hreflang JSONB NOT NULL DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS seo_breadcrumb JSONB NOT NULL DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS seo_faq_schema JSONB NOT NULL DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS seo_article_schema JSONB,
        ADD COLUMN IF NOT EXISTS seo_product_schema JSONB,
        ADD COLUMN IF NOT EXISTS seo_last_indexed_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS seo_index_priority REAL DEFAULT 0.5
    `);
    console.log("[Phase 4 Schema] ✓ SEO fields added to entities");

    // 1f. CRM-FELDER — Kundensegmente, Empfehlungslogik
    await db.execute(sql`
      ALTER TABLE entities
        ADD COLUMN IF NOT EXISTS crm_customer_segments JSONB NOT NULL DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS crm_purchase_intent_score REAL DEFAULT 0.5,
        ADD COLUMN IF NOT EXISTS crm_reorder_interval_days INTEGER,
        ADD COLUMN IF NOT EXISTS crm_lifetime_value_indicator VARCHAR(50),
        ADD COLUMN IF NOT EXISTS crm_whatsapp_trigger_keywords JSONB NOT NULL DEFAULT '[]'
    `);
    console.log("[Phase 4 Schema] ✓ CRM fields added to entities");

    // ═══════════════════════════════════════════════════════════════════════
    // BLOCK 2: NEUE TABELLEN
    // ═══════════════════════════════════════════════════════════════════════

    // 2a. STACKS — Compound-Kombinationen mit Ziel-basierter Logik
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS stacks (
        id TEXT PRIMARY KEY,
        slug VARCHAR(300) UNIQUE NOT NULL,
        name VARCHAR(300) NOT NULL,
        goal VARCHAR(300) NOT NULL,
        description TEXT,
        target_audience JSONB NOT NULL DEFAULT '[]',
        entity_ids JSONB NOT NULL DEFAULT '[]',
        entity_roles JSONB NOT NULL DEFAULT '{}',
        synergy_description TEXT,
        difficulty VARCHAR(50) DEFAULT 'intermediate',
        duration_weeks INTEGER,
        evidence_level VARCHAR(50) DEFAULT 'animal',
        is_featured BOOLEAN NOT NULL DEFAULT false,
        shop_bundle_id TEXT,
        academy_module_id TEXT,
        content_hook TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'draft',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log("[Phase 4 Schema] ✓ stacks table created");

    // 2b. CONTENT_OUTPUTS — Generierte Content-Stücke (Social, Newsletter, Blog)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS content_outputs (
        id TEXT PRIMARY KEY,
        entity_id TEXT REFERENCES entities(id) ON DELETE CASCADE,
        stack_id TEXT REFERENCES stacks(id) ON DELETE SET NULL,
        output_type VARCHAR(100) NOT NULL,
        platform VARCHAR(100),
        title VARCHAR(500),
        body TEXT NOT NULL,
        hashtags JSONB NOT NULL DEFAULT '[]',
        cta TEXT,
        target_audience VARCHAR(100),
        language VARCHAR(10) NOT NULL DEFAULT 'de',
        generated_by_ai BOOLEAN NOT NULL DEFAULT true,
        ai_model VARCHAR(100),
        approved BOOLEAN NOT NULL DEFAULT false,
        approved_by VARCHAR(200),
        approved_at TIMESTAMP,
        published_at TIMESTAMP,
        platform_post_id TEXT,
        engagement_data JSONB NOT NULL DEFAULT '{}',
        status VARCHAR(50) NOT NULL DEFAULT 'draft',
        version INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS content_outputs_entity_idx ON content_outputs(entity_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS content_outputs_type_idx ON content_outputs(output_type)`);
    console.log("[Phase 4 Schema] ✓ content_outputs table created");

    // 2c. ACADEMY_MODULES — Strukturierte Lernmodule
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS academy_modules (
        id TEXT PRIMARY KEY,
        slug VARCHAR(300) UNIQUE NOT NULL,
        title VARCHAR(500) NOT NULL,
        subtitle VARCHAR(500),
        entity_id TEXT REFERENCES entities(id) ON DELETE SET NULL,
        stack_id TEXT REFERENCES stacks(id) ON DELETE SET NULL,
        module_type VARCHAR(100) NOT NULL DEFAULT 'compound',
        learning_goals JSONB NOT NULL DEFAULT '[]',
        prerequisites JSONB NOT NULL DEFAULT '[]',
        difficulty VARCHAR(50) DEFAULT 'intermediate',
        estimated_time_minutes INTEGER,
        content_block_ids JSONB NOT NULL DEFAULT '[]',
        protocol_ids JSONB NOT NULL DEFAULT '[]',
        quiz_questions JSONB NOT NULL DEFAULT '[]',
        video_url TEXT,
        thumbnail_url TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_free BOOLEAN NOT NULL DEFAULT false,
        is_featured BOOLEAN NOT NULL DEFAULT false,
        status VARCHAR(50) NOT NULL DEFAULT 'draft',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS academy_modules_entity_idx ON academy_modules(entity_id)`);
    console.log("[Phase 4 Schema] ✓ academy_modules table created");

    // 2d. AGENT_QUERIES — Log aller Agent-Anfragen für Verbesserungsvorschläge
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS agent_queries (
        id TEXT PRIMARY KEY,
        agent_role VARCHAR(100) NOT NULL,
        query TEXT NOT NULL,
        entity_ids_accessed JSONB NOT NULL DEFAULT '[]',
        blocks_accessed JSONB NOT NULL DEFAULT '[]',
        relations_accessed JSONB NOT NULL DEFAULT '[]',
        response_quality REAL,
        missing_data_report TEXT,
        improvement_suggestions JSONB NOT NULL DEFAULT '[]',
        session_id TEXT,
        user_segment VARCHAR(100),
        language VARCHAR(10) DEFAULT 'de',
        duration_ms INTEGER,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS agent_queries_role_idx ON agent_queries(agent_role)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS agent_queries_created_idx ON agent_queries(created_at)`);
    console.log("[Phase 4 Schema] ✓ agent_queries table created");

    // 2e. PRODUCT_VIEWS — Sicht-Tabelle: Entity → Produkt-Mapping
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS product_views (
        id TEXT PRIMARY KEY,
        entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
        wawi_product_id TEXT,
        woocommerce_product_id TEXT,
        sku TEXT,
        product_name VARCHAR(500),
        product_type VARCHAR(100) DEFAULT 'simple',
        price_eur REAL,
        price_tier JSONB NOT NULL DEFAULT '{}',
        inventory_status VARCHAR(50) DEFAULT 'unknown',
        is_active BOOLEAN NOT NULL DEFAULT true,
        sync_status VARCHAR(50) DEFAULT 'pending',
        last_synced_at TIMESTAMP,
        sync_errors JSONB NOT NULL DEFAULT '[]',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS product_views_entity_idx ON product_views(entity_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS product_views_wawi_idx ON product_views(wawi_product_id)`);
    console.log("[Phase 4 Schema] ✓ product_views table created");

    // 2f. WEBHOOKS — Outbound-Webhooks für externe Systeme
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS webhooks (
        id TEXT PRIMARY KEY,
        name VARCHAR(300) NOT NULL,
        target_system VARCHAR(100) NOT NULL,
        url TEXT NOT NULL,
        secret TEXT,
        events JSONB NOT NULL DEFAULT '[]',
        entity_types JSONB NOT NULL DEFAULT '[]',
        active BOOLEAN NOT NULL DEFAULT true,
        last_triggered_at TIMESTAMP,
        trigger_count INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log("[Phase 4 Schema] ✓ webhooks table created");

    // 2g. KNOWLEDGE_SNAPSHOTS — Versionierte Snapshots für Agenten-Konsistenz
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS knowledge_snapshots (
        id TEXT PRIMARY KEY,
        entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
        snapshot_type VARCHAR(100) NOT NULL DEFAULT 'full',
        payload JSONB NOT NULL DEFAULT '{}',
        entity_version INTEGER NOT NULL DEFAULT 1,
        blocks_count INTEGER NOT NULL DEFAULT 0,
        relations_count INTEGER NOT NULL DEFAULT 0,
        sources_count INTEGER NOT NULL DEFAULT 0,
        created_for VARCHAR(100),
        expires_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS knowledge_snapshots_entity_idx ON knowledge_snapshots(entity_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS knowledge_snapshots_type_idx ON knowledge_snapshots(snapshot_type)`);
    console.log("[Phase 4 Schema] ✓ knowledge_snapshots table created");

    // ═══════════════════════════════════════════════════════════════════════
    // BLOCK 3: CONTENT_BLOCKS — Neue Felder für Content-System
    // ═══════════════════════════════════════════════════════════════════════
    await db.execute(sql`
      ALTER TABLE content_blocks
        ADD COLUMN IF NOT EXISTS output_formats JSONB NOT NULL DEFAULT '["portal","academy","shop","social","newsletter"]',
        ADD COLUMN IF NOT EXISTS tone VARCHAR(50) DEFAULT 'scientific',
        ADD COLUMN IF NOT EXISTS cta_text VARCHAR(200),
        ADD COLUMN IF NOT EXISTS cta_url TEXT,
        ADD COLUMN IF NOT EXISTS media_url TEXT,
        ADD COLUMN IF NOT EXISTS media_type VARCHAR(50),
        ADD COLUMN IF NOT EXISTS is_premium BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS word_count INTEGER,
        ADD COLUMN IF NOT EXISTS seo_focus_keyword VARCHAR(200),
        ADD COLUMN IF NOT EXISTS translation_status JSONB NOT NULL DEFAULT '{}'
    `);
    console.log("[Phase 4 Schema] ✓ Content block fields extended");

    // ═══════════════════════════════════════════════════════════════════════
    // BLOCK 4: RELATIONS — Neue Felder für Agenten-Kontext
    // ═══════════════════════════════════════════════════════════════════════
    await db.execute(sql`
      ALTER TABLE relations
        ADD COLUMN IF NOT EXISTS agent_visible BOOLEAN NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS shop_visible BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS academy_visible BOOLEAN NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS content_visible BOOLEAN NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS relation_context TEXT,
        ADD COLUMN IF NOT EXISTS bidirectional BOOLEAN NOT NULL DEFAULT false
    `);
    console.log("[Phase 4 Schema] ✓ Relation fields extended");

    // ═══════════════════════════════════════════════════════════════════════
    // BLOCK 5: API-KEYS — Erweitert für granulare Downstream-Permissions
    // ═══════════════════════════════════════════════════════════════════════
    await db.execute(sql`
      ALTER TABLE agent_api_keys
        ADD COLUMN IF NOT EXISTS allowed_systems JSONB NOT NULL DEFAULT '["portal"]',
        ADD COLUMN IF NOT EXISTS allowed_entity_types JSONB NOT NULL DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS max_relations_depth INTEGER DEFAULT 2,
        ADD COLUMN IF NOT EXISTS include_draft_content BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS webhook_url TEXT,
        ADD COLUMN IF NOT EXISTS webhook_secret TEXT
    `);
    console.log("[Phase 4 Schema] ✓ API key permissions extended");

    console.log("[Phase 4 Schema] ✅ All schema extensions complete");

  } catch (error: any) {
    console.error("[Phase 4 Schema] Error:", error?.message ?? error);
    throw error;
  }
}
