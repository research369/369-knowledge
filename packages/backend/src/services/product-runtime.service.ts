/**
 * product-runtime.service.ts
 *
 * Product Runtime Abstraktionsschicht.
 * Entscheidet automatisch: Hardcode-Fallback ODER zukünftige Product-SSOT.
 *
 * Weder Agenten noch Shop noch Academy müssen geändert werden,
 * wenn später die SSOT-Quelle wechselt.
 */

import { db } from "../db/index.js";
import { entities } from "../db/schema.js";
import { eq } from "drizzle-orm";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProductContext {
  slug: string;
  name: string;
  available: boolean;
  priceRange?: string;
  highlights: string[];
  targetAudience: string[];
  badgeLabels: string[];
  upsellSlugs: string[];
  contraindications: string[];
  storageInstructions?: string;
  disclaimer: string;
  source: "ssot" | "hardcode" | "db";
}

// ─── Hardcode Fallback Data ───────────────────────────────────────────────────
// Diese Daten werden verwendet, wenn keine SSOT-Daten vorhanden sind.
// NICHT ENTFERNEN — sie sind der Fallback für alle bestehenden Compounds.

const HARDCODE_PRODUCT_DATA: Record<string, Partial<ProductContext>> = {
  "bpc-157": {
    available: true,
    priceRange: "ab 39,90 €",
    highlights: [
      "Pentadecapeptid — 15 Aminosäuren",
      "Stabile Formulierung — lyophilisiert",
      "Batch-Zertifikat verfügbar",
      ">99% Reinheit (HPLC-verifiziert)",
    ],
    targetAudience: ["Regeneration", "Performance", "Longevity"],
    badgeLabels: ["Bestseller", "Research Grade", "EU Produced"],
    upsellSlugs: ["tb-500", "ghk-cu"],
    contraindications: [],
    storageInstructions: "Lyophilisiert bei -20°C lagern. Nach Rekonstitution bei 4°C max. 4 Wochen.",
    disclaimer: "Research Use Only. Not for human use. For laboratory research purposes only.",
  },
  "tb-500": {
    available: true,
    priceRange: "ab 49,90 €",
    highlights: [
      "Thymosin Beta-4 Fragment",
      "Lyophilisiert, hochrein",
      ">99% Reinheit",
    ],
    targetAudience: ["Regeneration", "Performance", "Tissue Repair"],
    badgeLabels: ["Research Grade", "EU Produced"],
    upsellSlugs: ["bpc-157"],
    contraindications: [],
    storageInstructions: "Bei -20°C lagern. Nach Rekonstitution bei 4°C max. 4 Wochen.",
    disclaimer: "Research Use Only. Not for human use.",
  },
  "ghk-cu": {
    available: true,
    priceRange: "ab 29,90 €",
    highlights: [
      "GHK-Cu Tripeptid-Komplex",
      "Topische Formulierung verfügbar",
      "Kollagen-Synthese Forschung",
    ],
    targetAudience: ["Skincare", "Anti-Aging", "Cosmeceutical"],
    badgeLabels: ["Cosmeceutical Grade", "EU Produced"],
    upsellSlugs: ["bpc-157"],
    contraindications: [],
    storageInstructions: "Kühl und dunkel lagern. Lichtgeschützt aufbewahren.",
    disclaimer: "Research Use Only. Not for human use.",
  },
  "ss-31": {
    available: true,
    priceRange: "ab 59,90 €",
    highlights: [
      "Szeto-Schiller Peptid SS-31",
      "Mitochondriale Membran-Targeting",
      ">99% Reinheit",
    ],
    targetAudience: ["Longevity", "Mitochondrial Health", "Performance"],
    badgeLabels: ["Research Grade", "Premium"],
    upsellSlugs: ["mots-c"],
    contraindications: [],
    storageInstructions: "Bei -20°C lagern.",
    disclaimer: "Research Use Only. Not for human use.",
  },
  "retatrutide": {
    available: true,
    priceRange: "auf Anfrage",
    highlights: [
      "Triple Agonist: GLP-1R + GIP-R + GCGR",
      "Phase-III Forschungsverbindung",
      "Höchste Reinheitsstandards",
    ],
    targetAudience: ["Metabolic Research", "Weight Management Research"],
    badgeLabels: ["Research Grade", "Phase III", "Premium"],
    upsellSlugs: ["mots-c", "ss-31"],
    contraindications: [],
    storageInstructions: "Bei -20°C lagern. Lichtgeschützt.",
    disclaimer: "Research Use Only. Not for human use. Investigational compound.",
  },
  "mots-c": {
    available: true,
    priceRange: "ab 69,90 €",
    highlights: [
      "Mitochondriales Open Reading Frame Peptid",
      "AMPK-Aktivierung",
      ">99% Reinheit",
    ],
    targetAudience: ["Longevity", "Metabolic Health", "Performance"],
    badgeLabels: ["Research Grade", "Longevity"],
    upsellSlugs: ["ss-31"],
    contraindications: [],
    storageInstructions: "Bei -20°C lagern.",
    disclaimer: "Research Use Only. Not for human use.",
  },
  "epithalon": {
    available: true,
    priceRange: "ab 44,90 €",
    highlights: [
      "Tetrapeptid Ala-Glu-Asp-Gly",
      "Telomerase-Forschung",
      ">99% Reinheit",
    ],
    targetAudience: ["Longevity", "Anti-Aging Research"],
    badgeLabels: ["Research Grade", "Longevity"],
    upsellSlugs: ["mots-c", "ss-31"],
    contraindications: [],
    storageInstructions: "Bei -20°C lagern.",
    disclaimer: "Research Use Only. Not for human use.",
  },
};

// ─── SSOT Interface (future) ──────────────────────────────────────────────────
// Wenn eine Product-SSOT (WooCommerce, PIM, etc.) verfügbar ist,
// wird diese Funktion die Daten liefern.

async function loadFromSSOT(slug: string): Promise<Partial<ProductContext> | null> {
  // TODO: WooCommerce / PIM API Integration
  // const wooProduct = await wooCommerceClient.getProduct(slug);
  // return mapWooProductToContext(wooProduct);
  return null; // Not yet implemented
}

// ─── DB Loader ────────────────────────────────────────────────────────────────

async function loadFromDB(slug: string): Promise<Partial<ProductContext> | null> {
  try {
    const [entity] = await db.select().from(entities)
      .where(eq(entities.slug, slug)).limit(1);

    if (!entity) return null;

    const e = entity as any;
    const hasShopData = e.shopBulletPoints?.length > 0 || e.shopBadgeLabels?.length > 0;
    if (!hasShopData) return null;

    return {
      available: entity.lifecycleStatus === "published",
      highlights: e.shopBulletPoints ?? [],
      targetAudience: e.shopTargetAudience ?? [],
      badgeLabels: e.shopBadgeLabels ?? [],
      upsellSlugs: [], // Resolved separately via relations
      contraindications: e.shopContraindications ?? [],
      storageInstructions: e.shopStorageInstructions,
      disclaimer: "Research Use Only. Not for human use.",
    };
  } catch {
    return null;
  }
}

// ─── Main Product Context Loader ──────────────────────────────────────────────

export async function getProductContext(slug: string): Promise<ProductContext | null> {
  // Priority: SSOT → DB → Hardcode
  let data: Partial<ProductContext> | null = null;
  let source: "ssot" | "hardcode" | "db" = "hardcode";

  // 1. Try SSOT (future)
  const ssotData = await loadFromSSOT(slug);
  if (ssotData) {
    data = ssotData;
    source = "ssot";
  }

  // 2. Try DB
  if (!data) {
    const dbData = await loadFromDB(slug);
    if (dbData) {
      data = dbData;
      source = "db";
    }
  }

  // 3. Hardcode Fallback
  if (!data) {
    const hardcode = HARDCODE_PRODUCT_DATA[slug];
    if (!hardcode) return null;
    data = hardcode;
    source = "hardcode";
  }

  // Load entity name
  let name = slug;
  try {
    const [entity] = await db.select({ canonicalName: entities.canonicalName })
      .from(entities).where(eq(entities.slug, slug)).limit(1);
    if (entity) name = entity.canonicalName;
  } catch { /* ignore */ }

  return {
    slug,
    name,
    available: data.available ?? false,
    priceRange: data.priceRange,
    highlights: data.highlights ?? [],
    targetAudience: data.targetAudience ?? [],
    badgeLabels: data.badgeLabels ?? [],
    upsellSlugs: data.upsellSlugs ?? [],
    contraindications: data.contraindications ?? [],
    storageInstructions: data.storageInstructions,
    disclaimer: data.disclaimer ?? "Research Use Only. Not for human use.",
    source,
  };
}

// ─── Upsell Resolver ──────────────────────────────────────────────────────────

export async function resolveUpsells(
  slugs: string[]
): Promise<{ slug: string; name: string; priceRange?: string }[]> {
  if (slugs.length === 0) return [];

  const result = [];
  for (const slug of slugs.slice(0, 3)) {
    const ctx = await getProductContext(slug);
    if (ctx) {
      result.push({ slug, name: ctx.name, priceRange: ctx.priceRange });
    }
  }
  return result;
}
