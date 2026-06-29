import { useState, useEffect } from "react";
import { api, Entity } from "@/lib/api";

const CATEGORY_LABELS: Record<string, string> = {
  compound: "Compound",
  peptide: "Peptid",
  guide: "Praxis-Guide",
  stack: "Stack",
  steroid: "Steroid",
  supplement: "Supplement",
  cosmetic: "Kosmetik",
};

const CATEGORY_ICONS: Record<string, string> = {
  compound: "⬡",
  peptide: "⬡",
  guide: "📋",
  stack: "⚡",
  steroid: "💪",
  supplement: "🧪",
  cosmetic: "✨",
};

const FILTER_TYPES = [
  { value: "", label: "Alle" },
  { value: "compound", label: "Compounds" },
  { value: "guide", label: "Guides" },
  { value: "stack", label: "Stacks" },
];

export default function Portal() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(() =>
    sessionStorage.getItem("age_confirmed") === "true"
  );

  useEffect(() => {
    api.entities
      .list({ status: "published" })
      .then((r) => setEntities(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = entities.filter((e) => {
    const matchType = !filter || e.type === filter || e.categories.includes(filter);
    const matchSearch =
      !search ||
      e.canonicalName.toLowerCase().includes(search.toLowerCase()) ||
      e.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    return matchType && matchSearch;
  });

  if (!ageConfirmed) {
    return <AgeGate onConfirm={() => { sessionStorage.setItem("age_confirmed", "true"); setAgeConfirmed(true); }} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-navy)" }}>
      {/* Disclaimer */}
      <div className="disclaimer-banner">
        Alle Inhalte dienen ausschließlich wissenschaftlichen und Forschungszwecken. Kein medizinischer Rat. Research Use Only.
      </div>

      {/* Nav */}
      <nav className="nav">
        <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: "64px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: "36px", height: "36px", background: "var(--color-blue-mid)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "1rem", fontFamily: "var(--font-condensed)" }}>
              369
            </div>
            <span style={{ fontFamily: "var(--font-condensed)", fontWeight: 700, fontSize: "1.1rem", letterSpacing: "0.02em" }}>
              Research <span style={{ color: "var(--color-gold)" }}>Wissen</span>
            </span>
          </div>
          <a href="https://369research.eu" target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ fontSize: "0.8125rem", padding: "0.5rem 1rem" }}>
            Zum Shop →
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: "5rem 0 3rem", textAlign: "center" }}>
        <div className="container">
          <div className="badge badge-blue" style={{ marginBottom: "1.5rem" }}>
            Evidenzbasiertes Wissen
          </div>
          <h1 style={{ marginBottom: "1rem", color: "white" }}>
            369 Research<br />
            <span style={{ color: "var(--color-gold)" }}>Wissensdatenbank</span>
          </h1>
          <p style={{ fontSize: "1.125rem", color: "rgba(255,255,255,0.65)", maxWidth: "600px", margin: "0 auto 2.5rem" }}>
            Wissenschaftlich fundierte Informationen zu Peptiden, Compounds und Praxis-Guides.
            Alle Inhalte basieren auf peer-reviewed Studien.
          </p>

          {/* Search */}
          <div style={{ maxWidth: "480px", margin: "0 auto 2rem", position: "relative" }}>
            <span style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.4)", fontSize: "1rem" }}>🔍</span>
            <input
              type="text"
              placeholder="Peptid oder Thema suchen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: "2.5rem" }}
            />
          </div>

          {/* Filter Tabs */}
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap" }}>
            {FILTER_TYPES.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`btn ${filter === f.value ? "btn-primary" : "btn-outline"}`}
                style={{ fontSize: "0.8125rem", padding: "0.5rem 1.25rem" }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="section" style={{ paddingTop: "2rem" }}>
        <div className="container">
          {loading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} className="card" style={{ height: "180px", opacity: 0.4, animation: "pulse 1.5s infinite" }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "4rem 0", color: "rgba(255,255,255,0.4)" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔬</div>
              <p>Keine Einträge gefunden.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" }}>
              {filtered.map((entity) => (
                <EntityCard key={entity.id} entity={entity} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "2rem 0", textAlign: "center" }}>
        <div className="container">
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.8125rem" }}>
            © 2025 369 Research — Alle Inhalte dienen ausschließlich Forschungszwecken. Research Use Only.
          </p>
        </div>
      </footer>
    </div>
  );
}

function EntityCard({ entity }: { entity: Entity }) {
  const icon = CATEGORY_ICONS[entity.type] ?? "⬡";
  const label = CATEGORY_LABELS[entity.type] ?? entity.type;

  return (
    <a
      href={`/wissen/${entity.id}`}
      className="card"
      style={{ display: "block", textDecoration: "none", cursor: "pointer" }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <span style={{ fontSize: "1.5rem" }}>{icon}</span>
        <span className="badge badge-blue" style={{ fontSize: "0.7rem" }}>{label}</span>
      </div>
      <h3 style={{ color: "white", marginBottom: "0.5rem", fontSize: "1.2rem" }}>
        {entity.canonicalName}
      </h3>
      {entity.seoDescription && (
        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.875rem", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {entity.seoDescription}
        </p>
      )}
      {entity.tags.length > 0 && (
        <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
          {entity.tags.slice(0, 3).map((tag) => (
            <span key={tag} style={{ fontSize: "0.7rem", padding: "0.2rem 0.5rem", background: "rgba(255,255,255,0.06)", borderRadius: "4px", color: "rgba(255,255,255,0.5)" }}>
              {tag}
            </span>
          ))}
        </div>
      )}
      <div style={{ marginTop: "1rem", color: "var(--color-blue-bright)", fontSize: "0.8125rem", fontWeight: 600 }}>
        Mehr erfahren →
      </div>
    </a>
  );
}

function AgeGate({ onConfirm }: { onConfirm: () => void }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-navy)", padding: "2rem" }}>
      <div className="card" style={{ maxWidth: "480px", width: "100%", textAlign: "center", padding: "3rem 2rem" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1.5rem" }}>🔬</div>
        <h2 style={{ marginBottom: "1rem", color: "white" }}>Zugangsbestätigung</h2>
        <p style={{ color: "rgba(255,255,255,0.6)", marginBottom: "0.75rem", lineHeight: 1.6 }}>
          Diese Seite enthält wissenschaftliche Informationen zu Research Compounds.
        </p>
        <p style={{ color: "rgba(255,255,255,0.6)", marginBottom: "2rem", lineHeight: 1.6 }}>
          Ich bestätige, dass ich <strong style={{ color: "white" }}>18 Jahre oder älter</strong> bin und diese Inhalte ausschließlich zu <strong style={{ color: "white" }}>Forschungszwecken</strong> nutze.
        </p>
        <button onClick={onConfirm} className="btn btn-primary" style={{ width: "100%", marginBottom: "0.75rem" }}>
          Ja, ich bestätige — Weiter
        </button>
        <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)" }}>
          Research Use Only. Kein medizinischer Rat.
        </p>
      </div>
    </div>
  );
}
