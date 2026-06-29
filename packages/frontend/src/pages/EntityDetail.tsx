import { useState, useEffect } from "react";
import { api, Entity, ContentBlock, Relation } from "@/lib/api";

interface EntityDetailData {
  entity: Entity;
  blocks: ContentBlock[];
  relations: Relation[];
}

const BLOCK_TYPE_LABELS: Record<string, string> = {
  what_is: "Was ist",
  simple_explanation: "Einfach erklärt",
  mechanism: "Wirkmechanismus",
  research_result: "Forschungsergebnis",
  faq: "Häufige Fragen",
  safety: "Sicherheitshinweise",
  references: "Quellen",
  materials: "Was du brauchst",
  steps: "Schritt-für-Schritt",
  common_errors: "Häufige Fehler",
};

export default function EntityDetail({ entityId }: { entityId: string }) {
  const [data, setData] = useState<EntityDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.entities
      .get(entityId)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [entityId]);

  if (loading) return <LoadingSkeleton />;
  if (error || !data) return <ErrorState error={error ?? "Nicht gefunden"} />;

  const { entity, blocks } = data;

  // Group blocks by type
  const blocksByType: Record<string, ContentBlock[]> = {};
  for (const b of blocks) {
    if (!blocksByType[b.blockType]) blocksByType[b.blockType] = [];
    blocksByType[b.blockType].push(b);
  }

  const l1Blocks = blocks.filter((b) => b.layer === "L1" || b.layer === "L2" || b.layer === "L3");

  // Schema.org JSON-LD
  const schemaOrg = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: entity.seoTitle ?? entity.canonicalName,
    description: entity.seoDescription,
    keywords: entity.seoKeywords.join(", "),
    publisher: {
      "@type": "Organization",
      name: "369 Research",
      url: "https://369research.eu",
    },
    dateModified: entity.updatedAt,
    datePublished: entity.publishedAt ?? entity.createdAt,
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-navy)" }}>
      {/* Schema.org */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }}
      />

      {/* SEO Meta (injected via document.title) */}
      {entity.seoTitle && (document.title = `${entity.seoTitle} | 369 Research Wissen`)}

      {/* Disclaimer */}
      <div className="disclaimer-banner">
        Research Use Only — Alle Inhalte dienen ausschließlich wissenschaftlichen Forschungszwecken.
      </div>

      {/* Nav */}
      <nav className="nav">
        <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: "64px" }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: "0.75rem", textDecoration: "none" }}>
            <div style={{ width: "36px", height: "36px", background: "var(--color-blue-mid)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "1rem", fontFamily: "var(--font-condensed)", color: "white" }}>
              369
            </div>
            <span style={{ fontFamily: "var(--font-condensed)", fontWeight: 700, fontSize: "1.1rem", color: "white" }}>
              Research <span style={{ color: "var(--color-gold)" }}>Wissen</span>
            </span>
          </a>
          <a href="/" style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.875rem", textDecoration: "none" }}>
            ← Zurück zur Übersicht
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: "4rem 0 3rem", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="container">
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
            <span className="badge badge-blue">{entity.type}</span>
            {entity.categories.map((c) => (
              <span key={c} className="badge badge-gold">{c}</span>
            ))}
            {entity.casNumber && (
              <span className="badge" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)", fontSize: "0.7rem" }}>
                CAS: {entity.casNumber}
              </span>
            )}
          </div>

          <h1 style={{ marginBottom: "1rem", color: "white" }}>{entity.canonicalName}</h1>

          {entity.seoDescription && (
            <p style={{ fontSize: "1.125rem", color: "rgba(255,255,255,0.65)", maxWidth: "700px", lineHeight: 1.7 }}>
              {entity.seoDescription}
            </p>
          )}

          {/* Metrics */}
          {entity.metrics.length > 0 && (
            <div style={{ display: "flex", gap: "1.5rem", marginTop: "2rem", flexWrap: "wrap" }}>
              {entity.metrics.map((m, i) => (
                <div key={i} style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--font-condensed)", fontSize: "1.75rem", fontWeight: 800, color: "var(--color-gold)" }}>
                    {m.value}{m.unit}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {m.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Content Blocks */}
      <section style={{ padding: "3rem 0" }}>
        <div className="container" style={{ maxWidth: "860px" }}>
          {l1Blocks.map((block) => (
            <ContentBlockRenderer key={block.id} block={block} />
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "2rem 0", textAlign: "center" }}>
        <div className="container">
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.8125rem" }}>
            © 2025 369 Research — Research Use Only. Kein medizinischer Rat.
          </p>
        </div>
      </footer>
    </div>
  );
}

function ContentBlockRenderer({ block }: { block: ContentBlock }) {
  const [open, setOpen] = useState(false);

  if (block.blockType === "faq") {
    return (
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "1.25rem 0" }}>
        <button
          onClick={() => setOpen(!open)}
          style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}
        >
          <span style={{ fontFamily: "var(--font-condensed)", fontWeight: 600, fontSize: "1.1rem", color: "white" }}>
            {block.title}
          </span>
          <span style={{ color: "var(--color-blue-bright)", fontSize: "1.25rem", flexShrink: 0 }}>
            {open ? "−" : "+"}
          </span>
        </button>
        {open && (
          <div style={{ marginTop: "0.875rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.7, fontSize: "0.9375rem" }}>
            {block.body}
          </div>
        )}
      </div>
    );
  }

  if (block.blockType === "references") {
    const refs = block.body.split("\n").filter(Boolean);
    return (
      <div style={{ marginBottom: "2rem", padding: "1.5rem", background: "rgba(255,255,255,0.03)", borderRadius: "var(--radius-lg)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <h3 style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.875rem", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "1rem" }}>
          Quellen & Referenzen
        </h3>
        <ol style={{ paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {refs.map((ref, i) => (
            <li key={i} style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8125rem", lineHeight: 1.6 }}>
              {ref.startsWith("http") ? (
                <a href={ref} target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-blue-bright)" }}>{ref}</a>
              ) : ref}
            </li>
          ))}
        </ol>
      </div>
    );
  }

  if (block.blockType === "research_result") {
    return (
      <div style={{ marginBottom: "1.5rem", padding: "1.5rem", background: "rgba(30, 58, 138, 0.15)", borderRadius: "var(--radius-lg)", borderLeft: "3px solid var(--color-blue-bright)" }}>
        {block.title && (
          <h4 style={{ color: "var(--color-blue-bright)", marginBottom: "0.5rem", fontSize: "1rem", fontWeight: 600 }}>
            {block.title}
          </h4>
        )}
        <p style={{ color: "rgba(255,255,255,0.75)", lineHeight: 1.7, fontSize: "0.9375rem" }}>{block.body}</p>
        {block.sources.length > 0 && (
          <div style={{ marginTop: "0.75rem", fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>
            Quelle: {block.sources.join(", ")}
          </div>
        )}
      </div>
    );
  }

  if (block.blockType === "mechanism") {
    return (
      <div className="card" style={{ marginBottom: "1rem" }}>
        {block.title && (
          <h4 style={{ color: "var(--color-gold)", marginBottom: "0.5rem", fontSize: "1rem", fontWeight: 600 }}>
            {block.title}
          </h4>
        )}
        <p style={{ color: "rgba(255,255,255,0.75)", lineHeight: 1.7, fontSize: "0.9375rem" }}>{block.body}</p>
      </div>
    );
  }

  // Default block
  return (
    <div style={{ marginBottom: "2rem" }}>
      {block.title && (
        <h2 style={{ color: "white", marginBottom: "1rem", fontSize: "clamp(1.3rem, 2.5vw, 1.75rem)" }}>
          {block.title}
        </h2>
      )}
      <div style={{ color: "rgba(255,255,255,0.7)", lineHeight: 1.8, fontSize: "0.9375rem", whiteSpace: "pre-wrap" }}>
        {block.body}
      </div>
      {block.sources.length > 0 && (
        <div style={{ marginTop: "0.75rem", fontSize: "0.75rem", color: "rgba(255,255,255,0.35)" }}>
          Quellen: {block.sources.join(" · ")}
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--color-navy)", padding: "4rem 0" }}>
      <div className="container" style={{ maxWidth: "860px" }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{ height: "120px", background: "rgba(255,255,255,0.04)", borderRadius: "12px", marginBottom: "1rem" }} />
        ))}
      </div>
    </div>
  );
}

function ErrorState({ error }: { error: string }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-navy)" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚠️</div>
        <p style={{ color: "rgba(255,255,255,0.5)" }}>{error}</p>
        <a href="/" className="btn btn-outline" style={{ marginTop: "1.5rem", display: "inline-flex" }}>← Zurück</a>
      </div>
    </div>
  );
}
