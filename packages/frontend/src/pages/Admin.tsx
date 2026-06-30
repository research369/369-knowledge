import { useState, useEffect, useCallback } from "react";
import { api, Entity, Topic } from "@/lib/api";
import { useAuth } from "@/lib/auth";

// ─── Types ────────────────────────────────────────────────────────────────────
type AdminTab = "dashboard" | "entities" | "review" | "topics" | "generate" | "ontologie";

const ENTITY_TYPES = [
  // Substanzen
  { value: "compound", label: "Compound" },
  { value: "peptide", label: "Peptid" },
  { value: "steroid", label: "Steroid" },
  { value: "supplement", label: "Supplement" },
  { value: "kosmetik", label: "Kosmetik" },
  // Biologie
  { value: "mechanismus", label: "Mechanismus" },
  { value: "signalweg", label: "Signalweg" },
  { value: "rezeptor", label: "Rezeptor" },
  { value: "gen", label: "Gen" },
  { value: "protein", label: "Protein" },
  { value: "organ", label: "Organ" },
  { value: "biomarker", label: "Biomarker" },
  // Klinik
  { value: "erkrankung", label: "Erkrankung" },
  { value: "symptom", label: "Symptom" },
  { value: "studie", label: "Studie" },
  // Wissen
  { value: "glossar", label: "Glossar" },
  { value: "guide", label: "Guide" },
  { value: "stack", label: "Stack" },
  { value: "faq", label: "FAQ" },
];

const STATUS_COLORS: Record<string, string> = {
  draft: "rgba(255,255,255,0.35)",
  review: "#f59e0b",
  pending_review: "#f59e0b",
  published: "#4ade80",
  archived: "rgba(255,255,255,0.2)",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Entwurf",
  review: "Review",
  pending_review: "Review",
  published: "Live",
  archived: "Archiv",
};

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function Admin() {
  const { isAdmin, login, logout } = useAuth();
  if (!isAdmin) return <LoginScreen onLogin={login} />;
  return <AdminShell onLogout={logout} />;
}

// ─── Login ────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: (pw: string) => Promise<void> }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await onLogin(password);
    } catch {
      setError("Falsches Passwort");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-navy)" }}>
      <div className="card" style={{ width: "100%", maxWidth: "400px", padding: "2.5rem" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <img
            src="https://369academy-pbxbt3uf.manus.space/manus-storage/369-research-logo_7c3bb4da.png"
            alt="369 Research"
            style={{ height: "48px", width: "auto", objectFit: "contain", margin: "0 auto 1rem", display: "block" }}
          />
          <h2 style={{ color: "white" }}>Knowledge Admin</h2>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.875rem", marginTop: "0.5rem" }}>Scientific OS — Verwaltung</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1rem" }}>
            <label className="form-label">Admin-Passwort</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              placeholder="••••••••"
              autoFocus
            />
          </div>
          {error && <p style={{ color: "#f87171", fontSize: "0.875rem", marginBottom: "1rem" }}>{error}</p>}
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: "100%" }}>
            {loading ? "..." : "Anmelden"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────
function AdminShell({ onLogout }: { onLogout: () => Promise<void> }) {
  const [tab, setTab] = useState<AdminTab>("dashboard");

  const tabs: { id: AdminTab; label: string; icon: string }[] = [
    { id: "dashboard", label: "Dashboard", icon: "⬡" },
    { id: "entities", label: "Entities", icon: "◈" },
    { id: "review", label: "Review Queue", icon: "◉" },
    { id: "topics", label: "Topics", icon: "◎" },
    { id: "generate", label: "KI-Workflow", icon: "✦" },
    { id: "ontologie", label: "Ontologie", icon: "⬢" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-navy)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.2)", padding: "0 1.5rem", height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            <img
              src="https://369academy-pbxbt3uf.manus.space/manus-storage/369-research-logo_7c3bb4da.png"
              alt="369 Research"
              style={{ height: "28px", width: "auto", objectFit: "contain" }}
            />
            <span style={{ fontFamily: "var(--font-condensed)", fontWeight: 700, color: "white", fontSize: "0.9375rem", letterSpacing: "0.02em" }}>
              Knowledge Admin
            </span>
          </div>
          <nav style={{ display: "flex", gap: "0.25rem" }}>
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  background: tab === t.id ? "rgba(37,99,235,0.2)" : "transparent",
                  border: tab === t.id ? "1px solid rgba(37,99,235,0.4)" : "1px solid transparent",
                  borderRadius: "6px",
                  color: tab === t.id ? "var(--color-blue-bright)" : "rgba(255,255,255,0.5)",
                  cursor: "pointer",
                  fontSize: "0.8125rem",
                  fontWeight: tab === t.id ? 600 : 400,
                  padding: "0.3rem 0.75rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: "0.75rem" }}>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </nav>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <a href="/" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8125rem", textDecoration: "none" }}>
            Portal →
          </a>
          <button onClick={onLogout} className="btn btn-outline" style={{ fontSize: "0.8125rem", padding: "0.3rem 0.75rem" }}>
            Abmelden
          </button>
        </div>
      </header>

      <main style={{ flex: 1, padding: "1.75rem 1.5rem", maxWidth: "1280px", margin: "0 auto", width: "100%" }}>
        {tab === "dashboard" && <DashboardTab />}
        {tab === "entities" && <EntitiesTab />}
        {tab === "review" && <ReviewTab />}
        {tab === "topics" && <TopicsTab />}
        {tab === "generate" && <GenerateTab />}
        {tab === "ontologie" && <OntologieTab />}
      </main>
    </div>
  );
}

// ─── Dashboard Tab ────────────────────────────────────────────────────────────
function DashboardTab() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.entities.adminAll(), api.topics.list()])
      .then(([e, t]) => {
        setEntities(e.data);
        setTopics(t.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;

  const byStatus = entities.reduce<Record<string, number>>((acc, e) => {
    acc[e.status] = (acc[e.status] || 0) + 1;
    return acc;
  }, {});

  const byType = entities.reduce<Record<string, number>>((acc, e) => {
    const t = e.entityType || (e as any).type || "unknown";
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});

  const aiGenerated = entities.filter((e) => e.generatedByAi).length;
  const recentlyUpdated = [...entities]
    .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
    .slice(0, 6);

  return (
    <div>
      <SectionHeader title="Dashboard" subtitle="Übersicht der Wissensbasis" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
        {[
          { label: "Entities gesamt", value: entities.length, color: "var(--color-blue-bright)", icon: "◈" },
          { label: "Live", value: byStatus["published"] || 0, color: "#4ade80", icon: "●" },
          { label: "In Review", value: (byStatus["review"] || 0) + (byStatus["pending_review"] || 0), color: "#f59e0b", icon: "◐" },
          { label: "KI-generiert", value: aiGenerated, color: "var(--color-gold)", icon: "✦" },
        ].map((kpi) => (
          <div key={kpi.label} className="card" style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{kpi.label}</span>
              <span style={{ color: kpi.color, fontSize: "1rem" }}>{kpi.icon}</span>
            </div>
            <div style={{ fontSize: "2.25rem", fontWeight: 800, fontFamily: "var(--font-condensed)", color: kpi.color, lineHeight: 1 }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
        <div className="card">
          <h3 style={{ color: "white", marginBottom: "1rem", fontSize: "0.9375rem", fontFamily: "var(--font-condensed)" }}>Entities nach Typ</h3>
          {Object.keys(byType).length === 0 ? (
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.875rem" }}>Noch keine Entities.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {Object.entries(byType)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => {
                  const label = ENTITY_TYPES.find((t) => t.value === type)?.label || type;
                  const pct = Math.round((count / entities.length) * 100);
                  return (
                    <div key={type}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                        <span style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.7)" }}>{label}</span>
                        <span style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.4)" }}>{count}</span>
                      </div>
                      <div style={{ height: "3px", background: "rgba(255,255,255,0.08)", borderRadius: "2px" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: "var(--color-blue-bright)", borderRadius: "2px" }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        <div className="card">
          <h3 style={{ color: "white", marginBottom: "1rem", fontSize: "0.9375rem", fontFamily: "var(--font-condensed)" }}>Topics ({topics.length})</h3>
          {topics.length === 0 ? (
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.875rem" }}>Noch keine Topics angelegt.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {topics.map((t) => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.5rem 0.75rem", background: "rgba(255,255,255,0.04)", borderRadius: "6px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    {t.icon && <span style={{ fontSize: "1rem" }}>{t.icon}</span>}
                    <span style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.8)" }}>{t.name}</span>
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)" }}>/{t.slug}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h3 style={{ color: "white", marginBottom: "1rem", fontSize: "0.9375rem", fontFamily: "var(--font-condensed)" }}>Zuletzt aktualisiert</h3>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Name", "Typ", "Status", "Aktualisiert"].map((h) => (
                <th key={h} style={{ padding: "0.5rem 0.75rem", textAlign: "left", fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentlyUpdated.map((e) => (
              <tr key={e.id} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <td style={{ padding: "0.625rem 0.75rem", color: "rgba(255,255,255,0.85)", fontSize: "0.875rem" }}>{e.canonicalName}</td>
                <td style={{ padding: "0.625rem 0.75rem", color: "rgba(255,255,255,0.4)", fontSize: "0.8125rem" }}>
                  {ENTITY_TYPES.find((t) => t.value === (e.entityType || (e as any).type))?.label || e.entityType}
                </td>
                <td style={{ padding: "0.625rem 0.75rem" }}>
                  <StatusBadge status={e.status} />
                </td>
                <td style={{ padding: "0.625rem 0.75rem", color: "rgba(255,255,255,0.3)", fontSize: "0.8125rem" }}>
                  {e.updatedAt ? new Date(e.updatedAt).toLocaleDateString("de-DE") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Entities Tab ─────────────────────────────────────────────────────────────
function EntitiesTab() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [search, setSearch] = useState("");
  const [editEntity, setEditEntity] = useState<Entity | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.entities.adminAll()
      .then((r) => setEntities(r.data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = entities.filter((e) => {
    if (filterStatus !== "all" && e.status !== filterStatus) return false;
    const eType = e.entityType || (e as any).type || "";
    if (filterType !== "all" && eType !== filterType) return false;
    if (search && !e.canonicalName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (showCreate) {
    return <EntityForm onCancel={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); load(); }} />;
  }
  if (editEntity) {
    return <EntityForm entity={editEntity} onCancel={() => setEditEntity(null)} onSaved={() => { setEditEntity(null); load(); }} />;
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <SectionHeader title="Entities" subtitle={`${entities.length} Einträge in der Wissensbasis`} />
        <button onClick={() => setShowCreate(true)} className="btn btn-gold">+ Neuer Eintrag</button>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Suchen..."
          className="form-input"
          style={{ width: "220px", padding: "0.4rem 0.75rem", fontSize: "0.875rem" }}
        />
        <div style={{ display: "flex", gap: "0.375rem" }}>
          {["all", "draft", "review", "published"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`btn ${filterStatus === s ? "btn-primary" : "btn-outline"}`}
              style={{ fontSize: "0.8125rem", padding: "0.375rem 0.75rem" }}
            >
              {s === "all" ? "Alle" : STATUS_LABELS[s] || s}
            </button>
          ))}
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="form-input"
          style={{ width: "160px", padding: "0.4rem 0.75rem", fontSize: "0.875rem" }}
        >
          <option value="all">Alle Typen</option>
          {ENTITY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "rgba(255,255,255,0.3)" }}>
            Keine Einträge gefunden.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                {["Name", "Typ", "Status", "KI", "Aktualisiert", "Aktionen"].map((h) => (
                  <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((entity) => {
                const eType = entity.entityType || (entity as any).type || "";
                return (
                  <tr key={entity.id} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <div style={{ color: "rgba(255,255,255,0.9)", fontSize: "0.875rem", fontWeight: 500 }}>{entity.canonicalName}</div>
                      {entity.slug && <div style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.75rem", marginTop: "0.125rem" }}>{entity.slug}</div>}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "rgba(255,255,255,0.4)", fontSize: "0.8125rem" }}>
                      {ENTITY_TYPES.find((t) => t.value === eType)?.label || eType}
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <StatusBadge status={entity.status} />
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: entity.generatedByAi ? "var(--color-gold)" : "rgba(255,255,255,0.2)", fontSize: "0.875rem" }}>
                      {entity.generatedByAi ? "✦" : "—"}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "rgba(255,255,255,0.3)", fontSize: "0.8125rem" }}>
                      {entity.updatedAt ? new Date(entity.updatedAt).toLocaleDateString("de-DE") : "—"}
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <div style={{ display: "flex", gap: "0.375rem" }}>
                        <ActionBtn label="Bearbeiten" onClick={() => setEditEntity(entity)} />
                        {entity.status !== "published" ? (
                          <ActionBtn label="Live" color="#4ade80" onClick={async () => { await api.entities.publish(entity.id); load(); }} />
                        ) : (
                          <ActionBtn label="Offline" color="#f87171" onClick={async () => { await api.entities.unpublish(entity.id); load(); }} />
                        )}
                        <ActionBtn label="✕" color="#f87171" onClick={async () => {
                          if (confirm(`"${entity.canonicalName}" wirklich löschen?`)) {
                            await api.entities.delete(entity.id);
                            load();
                          }
                        }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Topics Tab ───────────────────────────────────────────────────────────────
function TopicsTab() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTopic, setEditTopic] = useState<Topic | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", description: "", icon: "", sortOrder: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    api.topics.list()
      .then((r) => setTopics(r.data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setForm({ name: "", slug: "", description: "", icon: "", sortOrder: topics.length });
    setEditTopic(null);
    setShowForm(true);
  };

  const openEdit = (t: Topic) => {
    setForm({ name: t.name, slug: t.slug, description: t.description || "", icon: t.icon || "", sortOrder: t.sortOrder || 0 });
    setEditTopic(t);
    setShowForm(true);
  };

  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const handleSave = async () => {
    if (!form.name || !form.slug) { setError("Name und Slug sind Pflichtfelder"); return; }
    setSaving(true);
    setError("");
    try {
      if (editTopic) {
        await api.topics.update(editTopic.id, form);
      } else {
        await api.topics.create(form);
      }
      setShowForm(false);
      load();
    } catch (e: any) {
      setError(e.message || "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <SectionHeader title="Topics" subtitle="Themengebiete der Wissensbasis" />
        <button onClick={openCreate} className="btn btn-gold">+ Neues Topic</button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: "1.5rem", borderColor: "rgba(37,99,235,0.3)" }}>
          <h3 style={{ color: "white", marginBottom: "1.25rem", fontFamily: "var(--font-condensed)" }}>
            {editTopic ? `Bearbeiten: ${editTopic.name}` : "Neues Topic"}
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label className="form-label">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value, slug: editTopic ? form.slug : autoSlug(e.target.value) })}
                className="form-input"
                placeholder="z.B. Longevity"
              />
            </div>
            <div>
              <label className="form-label">Slug *</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="form-input"
                placeholder="z.B. longevity"
              />
            </div>
            <div>
              <label className="form-label">Icon (Emoji)</label>
              <input
                type="text"
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                className="form-input"
                placeholder="z.B. 🧬"
              />
            </div>
            <div>
              <label className="form-label">Sortierung</label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                className="form-input"
              />
            </div>
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label className="form-label">Beschreibung</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="form-input"
              rows={2}
              placeholder="Kurze Beschreibung des Themengebiets..."
            />
          </div>
          {error && <p style={{ color: "#f87171", fontSize: "0.875rem", marginBottom: "0.75rem" }}>{error}</p>}
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
            <button onClick={() => setShowForm(false)} className="btn btn-outline">Abbrechen</button>
            <button onClick={handleSave} disabled={saving} className="btn btn-primary">
              {saving ? "Speichern..." : "Speichern"}
            </button>
          </div>
        </div>
      )}

      {loading ? <LoadingState /> : topics.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem", color: "rgba(255,255,255,0.3)" }}>
          Noch keine Topics. Erstelle das erste Themengebiet.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
          {topics.map((t) => (
            <div key={t.id} className="card" style={{ padding: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                  {t.icon && <span style={{ fontSize: "1.5rem" }}>{t.icon}</span>}
                  <div>
                    <div style={{ color: "white", fontWeight: 600, fontSize: "0.9375rem" }}>{t.name}</div>
                    <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.75rem" }}>/{t.slug}</div>
                  </div>
                </div>
                <button onClick={() => openEdit(t)} className="btn btn-outline" style={{ fontSize: "0.75rem", padding: "0.25rem 0.625rem" }}>
                  Edit
                </button>
              </div>
              {t.description && (
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8125rem", lineHeight: 1.5 }}>{t.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Generate Tab (KI-Workflow) ───────────────────────────────────────────────
function GenerateTab() {
  const [name, setName] = useState("");
  const [type, setType] = useState("compound");
  const [context, setContext] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedBlocks, setGeneratedBlocks] = useState<any[]>([]);
  const [entityId, setEntityId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"input" | "preview" | "done">("input");
  const [publishing, setPublishing] = useState(false);

  const handleGenerate = async () => {
    if (!name.trim()) { setError("Bitte einen Namen eingeben"); return; }
    setGenerating(true);
    setError("");
    setGeneratedBlocks([]);
    setEntityId(null);
    try {
      const created = await api.entities.create({ canonicalName: name, type: type });
      setEntityId(created.entity.id);
      const result = await api.entities.generate(created.entity.id, context || undefined);
      setGeneratedBlocks(result.blocks || []);
      setStep("preview");
    } catch (e: any) {
      setError(e.message || "Fehler bei der KI-Generierung");
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!entityId) return;
    setPublishing(true);
    try {
      await api.entities.publish(entityId);
      setStep("done");
    } catch (e: any) {
      setError(e.message || "Fehler beim Veröffentlichen");
    } finally {
      setPublishing(false);
    }
  };

  const handleReset = () => {
    setName(""); setType("compound"); setContext("");
    setGeneratedBlocks([]); setEntityId(null); setError(""); setStep("input");
  };

  return (
    <div style={{ maxWidth: "800px" }}>
      <SectionHeader title="KI-Workflow" subtitle="Neuen Eintrag mit KI generieren und veröffentlichen" />

      <div style={{ display: "flex", alignItems: "center", gap: "0", marginBottom: "2rem" }}>
        {[
          { id: "input", label: "1. Eingabe" },
          { id: "preview", label: "2. Vorschau" },
          { id: "done", label: "3. Live" },
        ].map((s, i) => (
          <div key={s.id} style={{ display: "flex", alignItems: "center" }}>
            <div style={{
              padding: "0.375rem 1rem", borderRadius: "20px", fontSize: "0.8125rem",
              fontWeight: step === s.id ? 600 : 400,
              background: step === s.id ? "var(--color-blue-bright)" : "rgba(255,255,255,0.06)",
              color: step === s.id ? "white" : "rgba(255,255,255,0.3)",
            }}>
              {s.label}
            </div>
            {i < 2 && <div style={{ width: "2rem", height: "1px", background: "rgba(255,255,255,0.1)" }} />}
          </div>
        ))}
      </div>

      {step === "input" && (
        <div className="card">
          <h3 style={{ color: "white", marginBottom: "1.25rem", fontFamily: "var(--font-condensed)" }}>Compound / Entity definieren</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label className="form-label">Kanonischer Name *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="form-input" placeholder="z.B. BPC-157" autoFocus />
            </div>
            <div>
              <label className="form-label">Typ</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="form-input">
                {ENTITY_TYPES.map((t) => (
                  <option key={t.value} value={t.value} style={{ background: "#0a1628" }}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: "1.25rem" }}>
            <label className="form-label">Kontext für die KI (optional)</label>
            <textarea value={context} onChange={(e) => setContext(e.target.value)} className="form-input" rows={3} placeholder="z.B. Fokus auf Longevity, Vergleich mit TB-500, CAS 137525-51-0..." />
          </div>
          {error && <p style={{ color: "#f87171", fontSize: "0.875rem", marginBottom: "0.75rem" }}>{error}</p>}
          <button onClick={handleGenerate} disabled={generating || !name.trim()} className="btn btn-primary" style={{ width: "100%", padding: "0.75rem" }}>
            {generating ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span>
                KI generiert Inhalte...
              </span>
            ) : "✦ KI-Generierung starten"}
          </button>
          <p style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.75rem", textAlign: "center", marginTop: "0.75rem" }}>
            Mechanismus, Wirkungen, Protokoll, FAQ, Quellen — alles automatisch.
          </p>
        </div>
      )}

      {step === "preview" && (
        <div>
          <div style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "10px", padding: "1rem 1.25rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ color: "#4ade80", fontSize: "1.25rem" }}>✓</span>
            <div>
              <div style={{ color: "#4ade80", fontWeight: 600, fontSize: "0.9375rem" }}>{generatedBlocks.length} Blöcke generiert</div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8125rem" }}>Bitte prüfen und dann veröffentlichen oder als Entwurf speichern.</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem", maxHeight: "500px", overflowY: "auto" }}>
            {generatedBlocks.map((b, i) => (
              <div key={i} className="card" style={{ padding: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "0.7rem", color: "var(--color-gold)", textTransform: "uppercase", letterSpacing: "0.06em", background: "rgba(212,175,55,0.1)", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>{b.blockType}</span>
                  <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{b.layer}</span>
                </div>
                {b.title && <div style={{ color: "white", fontWeight: 600, fontSize: "0.9375rem", marginBottom: "0.375rem" }}>{b.title}</div>}
                <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8125rem", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{b.body}</div>
              </div>
            ))}
          </div>
          {error && <p style={{ color: "#f87171", fontSize: "0.875rem", marginBottom: "0.75rem" }}>{error}</p>}
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button onClick={handleReset} className="btn btn-outline" style={{ flex: 1 }}>Verwerfen</button>
            <button onClick={handlePublish} disabled={publishing} className="btn btn-primary" style={{ flex: 1 }}>
              {publishing ? "Veröffentliche..." : "✓ Jetzt veröffentlichen"}
            </button>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✓</div>
          <h3 style={{ color: "#4ade80", fontFamily: "var(--font-condensed)", fontSize: "1.5rem", marginBottom: "0.5rem" }}>{name} ist jetzt live!</h3>
          <p style={{ color: "rgba(255,255,255,0.4)", marginBottom: "1.5rem" }}>Der Eintrag ist veröffentlicht und im Portal sichtbar.</p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
            <button onClick={handleReset} className="btn btn-primary">Weiteren Eintrag erstellen</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Entity Form ──────────────────────────────────────────────────────────────
function EntityForm({ entity, onCancel, onSaved }: { entity?: Entity | null; onCancel: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    canonicalName: entity?.canonicalName || "",
    entityType: entity?.entityType || (entity as any)?.type || "compound",
    casNumber: entity?.casNumber || "",
    seoDescription: entity?.seoDescription || "",
    tags: entity?.tags?.join(", ") || "",
    shortDescription: entity?.shortDescription || "",
  });
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedBlocks, setGeneratedBlocks] = useState<any[]>([]);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!form.canonicalName) { setError("Name ist Pflichtfeld"); return; }
    setSaving(true);
    setError("");
    try {
      const data = {
        canonicalName: form.canonicalName,
        type: form.entityType,
        casNumber: form.casNumber || undefined,
        seoDescription: form.seoDescription || undefined,
        shortDescription: form.shortDescription || undefined,
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      };
      if (entity) {
        await api.entities.update(entity.id, data);
      } else {
        await api.entities.create(data);
      }
      onSaved();
    } catch (e: any) {
      setError(e.message || "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    if (!form.canonicalName) { setError("Bitte zuerst einen Namen eingeben"); return; }
    setGenerating(true);
    setError("");
    try {
      let id = entity?.id;
      if (!id) {
        const created = await api.entities.create({ canonicalName: form.canonicalName, type: form.entityType });
        id = created.entity.id;
      }
      const result = await api.entities.generate(id);
      setGeneratedBlocks(result.blocks || []);
    } catch (e: any) {
      setError(e.message || "Fehler bei der KI-Generierung");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
        <button onClick={onCancel} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "0.875rem" }}>
          ← Zurück
        </button>
        <SectionHeader title={entity ? `Bearbeiten: ${entity.canonicalName}` : "Neuer Eintrag"} subtitle="" />
      </div>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
          <div>
            <label className="form-label">Kanonischer Name *</label>
            <input type="text" value={form.canonicalName} onChange={(e) => setForm({ ...form, canonicalName: e.target.value })} className="form-input" placeholder="z.B. BPC-157" />
          </div>
          <div>
            <label className="form-label">Typ</label>
            <select value={form.entityType} onChange={(e) => setForm({ ...form, entityType: e.target.value })} className="form-input">
              {ENTITY_TYPES.map((t) => (
                <option key={t.value} value={t.value} style={{ background: "#0a1628" }}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">CAS-Nummer</label>
            <input type="text" value={form.casNumber} onChange={(e) => setForm({ ...form, casNumber: e.target.value })} className="form-input" placeholder="z.B. 137525-51-0" />
          </div>
          <div>
            <label className="form-label">Tags (kommagetrennt)</label>
            <input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="form-input" placeholder="Regeneration, Wundheilung..." />
          </div>
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label className="form-label">Kurzbeschreibung</label>
          <textarea value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} className="form-input" rows={2} placeholder="1-2 Sätze für Übersichten..." />
        </div>
        <div>
          <label className="form-label">SEO-Beschreibung</label>
          <textarea value={form.seoDescription} onChange={(e) => setForm({ ...form, seoDescription: e.target.value })} className="form-input" rows={2} placeholder="Meta-Description für Suchmaschinen..." />
        </div>
      </div>

      <div className="card" style={{ marginBottom: "1.5rem", borderColor: "rgba(37,99,235,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: generatedBlocks.length > 0 ? "1rem" : 0 }}>
          <div>
            <h4 style={{ color: "white", fontFamily: "var(--font-condensed)" }}>KI-Generierung</h4>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8125rem", marginTop: "0.25rem" }}>Texte, Mechanismen, FAQ und Quellen automatisch erstellen.</p>
          </div>
          <button onClick={handleGenerate} disabled={generating || !form.canonicalName} className="btn btn-primary" style={{ minWidth: "160px" }}>
            {generating ? <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span>Generiere...</span> : "✦ KI generieren"}
          </button>
        </div>
        {generatedBlocks.length > 0 && (
          <div>
            <div style={{ fontSize: "0.8125rem", color: "#4ade80", marginBottom: "0.75rem" }}>✓ {generatedBlocks.length} Blöcke generiert</div>
            <div style={{ maxHeight: "280px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {generatedBlocks.map((b, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "0.75rem 1rem" }}>
                  <div style={{ fontSize: "0.7rem", color: "var(--color-gold)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>{b.blockType} · {b.layer}</div>
                  {b.title && <div style={{ color: "white", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.25rem" }}>{b.title}</div>}
                  <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8125rem", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{b.body}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && <p style={{ color: "#f87171", fontSize: "0.875rem", marginBottom: "0.75rem" }}>{error}</p>}
      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
        <button onClick={onCancel} className="btn btn-outline">Abbrechen</button>
        <button onClick={handleSave} disabled={saving} className="btn btn-primary">
          {saving ? "Speichern..." : entity ? "Änderungen speichern" : "Erstellen"}
        </button>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: subtitle ? "1.5rem" : 0 }}>
      <h2 style={{ color: "white", fontFamily: "var(--font-condensed)", fontSize: "1.5rem", fontWeight: 700, letterSpacing: "0.01em" }}>{title}</h2>
      {subtitle && <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.875rem", marginTop: "0.25rem" }}>{subtitle}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span style={{
      fontSize: "0.7rem", fontWeight: 600,
      color: STATUS_COLORS[status] || "rgba(255,255,255,0.3)",
      background: `${STATUS_COLORS[status] || "rgba(255,255,255,0.3)"}18`,
      border: `1px solid ${STATUS_COLORS[status] || "rgba(255,255,255,0.3)"}40`,
      borderRadius: "4px", padding: "0.2rem 0.5rem",
      textTransform: "uppercase", letterSpacing: "0.04em",
    }}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function ActionBtn({ label, onClick, color }: { label: string; onClick: () => void; color?: string }) {
  return (
    <button onClick={onClick} style={{
      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: "5px", color: color || "rgba(255,255,255,0.6)", cursor: "pointer",
      fontSize: "0.75rem", padding: "0.25rem 0.625rem", transition: "all 0.15s",
    }}>
      {label}
    </button>
  );
}

function LoadingState() {
  return (
    <div style={{ padding: "3rem", textAlign: "center", color: "rgba(255,255,255,0.3)" }}>
      <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem", animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</div>
      <div>Lade...</div>
    </div>
  );
}

// ─── Review Queue Tab ─────────────────────────────────────────────────────────
function ReviewTab() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.entities.list({ status: "review" });
      setEntities(res.data || []);
    } catch {
      setEntities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (id: string) => {
    setProcessing(id);
    try {
      await api.entities.publish(id);
      await load();
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessing(id);
    try {
      await api.entities.update(id, { status: "draft" } as any);
      await load();
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div>
      <SectionHeader title="Review Queue" subtitle="Alle Einträge die auf Freigabe warten." />
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <LoadingState />
        ) : entities.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>✓</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9375rem" }}>Review Queue ist leer — alle Einträge sind geprüft.</div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                {["Name", "Typ", "KI", "Erstellt", "Aktionen"].map((h) => (
                  <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entities.map((entity) => {
                const eType = entity.entityType || (entity as any).type || "";
                const isProcessing = processing === entity.id;
                return (
                  <tr key={entity.id} style={{ borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(245,158,11,0.03)" }}>
                    <td style={{ padding: "0.875rem 1rem" }}>
                      <div style={{ color: "rgba(255,255,255,0.9)", fontSize: "0.875rem", fontWeight: 500 }}>{entity.canonicalName}</div>
                      {entity.slug && <div style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.75rem", marginTop: "0.125rem" }}>/{entity.slug}</div>}
                    </td>
                    <td style={{ padding: "0.875rem 1rem", color: "rgba(255,255,255,0.4)", fontSize: "0.8125rem" }}>
                      {ENTITY_TYPES.find((t) => t.value === eType)?.label || eType}
                    </td>
                    <td style={{ padding: "0.875rem 1rem", color: entity.generatedByAi ? "var(--color-gold)" : "rgba(255,255,255,0.2)", fontSize: "0.875rem" }}>
                      {entity.generatedByAi ? "✦ KI" : "Manuell"}
                    </td>
                    <td style={{ padding: "0.875rem 1rem", color: "rgba(255,255,255,0.3)", fontSize: "0.8125rem" }}>
                      {entity.createdAt ? new Date(entity.createdAt).toLocaleDateString("de-DE") : "—"}
                    </td>
                    <td style={{ padding: "0.875rem 1rem" }}>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          disabled={isProcessing}
                          onClick={() => handleApprove(entity.id)}
                          style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)", borderRadius: "5px", color: "#4ade80", cursor: "pointer", fontSize: "0.8125rem", padding: "0.375rem 0.875rem", fontWeight: 600 }}
                        >
                          {isProcessing ? "..." : "✓ Freigeben"}
                        </button>
                        <button
                          disabled={isProcessing}
                          onClick={() => handleReject(entity.id)}
                          style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: "5px", color: "#f87171", cursor: "pointer", fontSize: "0.8125rem", padding: "0.375rem 0.875rem" }}
                        >
                          Zurück zu Entwurf
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {entities.length > 0 && (
        <div style={{ marginTop: "1rem", display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={async () => {
              if (!confirm(`Alle ${entities.length} Einträge freigeben?`)) return;
              for (const e of entities) await api.entities.publish(e.id);
              await load();
            }}
            className="btn btn-primary"
          >
            Alle {entities.length} freigeben
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Ontologie Tab ────────────────────────────────────────────────────────────
function OntologieTab() {
  const [stats, setStats] = useState<{ type: string; count: number; published: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.entities.list({});
        const all: Entity[] = res.data || [];
        setTotal(all.length);
        const map: Record<string, { count: number; published: number }> = {};
        for (const e of all) {
          const t = e.entityType || (e as any).type || "unbekannt";
          if (!map[t]) map[t] = { count: 0, published: 0 };
          map[t].count++;
          if (e.status === "published") map[t].published++;
        }
        const sorted = Object.entries(map)
          .map(([type, v]) => ({ type, ...v }))
          .sort((a, b) => b.count - a.count);
        setStats(sorted);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const RELATION_TYPES = [
    { value: "activates", label: "Aktiviert", color: "#4ade80" },
    { value: "inhibits", label: "Inhibiert", color: "#f87171" },
    { value: "binds_to", label: "Bindet an", color: "#60a5fa" },
    { value: "synergizes_with", label: "Synergiert mit", color: "#a78bfa" },
    { value: "antagonizes", label: "Antagonisiert", color: "#fb923c" },
    { value: "upregulates", label: "Hochreguliert", color: "#34d399" },
    { value: "downregulates", label: "Herunterreguliert", color: "#f472b6" },
    { value: "treats", label: "Behandelt", color: "#fbbf24" },
    { value: "causes", label: "Verursacht", color: "#f87171" },
    { value: "biomarker_for", label: "Biomarker für", color: "#38bdf8" },
    { value: "part_of", label: "Teil von", color: "#a3a3a3" },
    { value: "related_to", label: "Verwandt mit", color: "#d1d5db" },
  ];

  const EVIDENCE_LEVELS = [
    { level: "1", label: "L1 — Tier 1 RCT / Meta-Analyse", color: "#4ade80" },
    { level: "2", label: "L2 — Tier 2 Klinische Studie", color: "#a3e635" },
    { level: "3", label: "L3 — Tier 3 Tierversuch", color: "#fbbf24" },
    { level: "4", label: "L4 — Tier 4 In-vitro", color: "#fb923c" },
    { level: "5", label: "L5 — Tier 5 Anekdotisch", color: "#f87171" },
  ];

  return (
    <div>
      <SectionHeader title="Ontologie" subtitle="Übersicht aller Inhaltstypen, Relationen und Evidenzebenen." />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        {/* Entity-Typen */}
        <div>
          <h3 style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8125rem", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.875rem" }}>
            Entity-Typen ({total} gesamt)
          </h3>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {loading ? <LoadingState /> : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    {["Typ", "Gesamt", "Live", "Fortschritt"].map((h) => (
                      <th key={h} style={{ padding: "0.625rem 1rem", textAlign: "left", fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.map((s) => {
                    const pct = s.count > 0 ? Math.round((s.published / s.count) * 100) : 0;
                    return (
                      <tr key={s.type} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                        <td style={{ padding: "0.625rem 1rem", color: "rgba(255,255,255,0.8)", fontSize: "0.875rem" }}>
                          {ENTITY_TYPES.find((t) => t.value === s.type)?.label || s.type}
                        </td>
                        <td style={{ padding: "0.625rem 1rem", color: "rgba(255,255,255,0.5)", fontSize: "0.875rem" }}>{s.count}</td>
                        <td style={{ padding: "0.625rem 1rem", color: "#4ade80", fontSize: "0.875rem" }}>{s.published}</td>
                        <td style={{ padding: "0.625rem 1rem" }}>
                          <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: "4px", height: "6px", width: "80px", overflow: "hidden" }}>
                            <div style={{ background: "var(--color-blue-bright)", height: "100%", width: `${pct}%`, borderRadius: "4px", transition: "width 0.3s" }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {stats.length === 0 && (
                    <tr><td colSpan={4} style={{ padding: "2rem", textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: "0.875rem" }}>Noch keine Einträge vorhanden.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Relationstypen */}
        <div>
          <h3 style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8125rem", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.875rem" }}>
            Relationstypen ({RELATION_TYPES.length})
          </h3>
          <div className="card" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {RELATION_TYPES.map((r) => (
              <div key={r.value} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: r.color, flexShrink: 0 }} />
                <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.875rem" }}>{r.label}</span>
                <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.75rem", marginLeft: "auto", fontFamily: "monospace" }}>{r.value}</span>
              </div>
            ))}
          </div>

          <h3 style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8125rem", textTransform: "uppercase", letterSpacing: "0.06em", margin: "1.25rem 0 0.875rem" }}>
            Evidenzebenen
          </h3>
          <div className="card" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {EVIDENCE_LEVELS.map((e) => (
              <div key={e.level} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: e.color, flexShrink: 0 }} />
                <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.875rem" }}>{e.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* URL-Struktur Referenz */}
      <div style={{ marginTop: "1.5rem" }}>
        <h3 style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8125rem", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.875rem" }}>
          URL-Struktur
        </h3>
        <div className="card" style={{ padding: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
            {[
              { path: "/compounds/:slug", desc: "Compounds, Peptide, Steroide" },
              { path: "/mechanismen/:slug", desc: "Mechanismen & Signalwege" },
              { path: "/studien/:slug", desc: "Studien & Publikationen" },
              { path: "/themen/:slug", desc: "Themengebiete (Hub-Seiten)" },
              { path: "/glossar/:slug", desc: "Glossar-Einträge" },
              { path: "/guides/:slug", desc: "Guides & Protokolle" },
              { path: "/suche", desc: "Volltextsuche" },
              { path: "/admin", desc: "Admin-Panel (geschützt)" },
            ].map((u) => (
              <div key={u.path} style={{ background: "rgba(255,255,255,0.04)", borderRadius: "6px", padding: "0.625rem 0.875rem" }}>
                <div style={{ color: "var(--color-gold)", fontSize: "0.8125rem", fontFamily: "monospace", marginBottom: "0.25rem" }}>{u.path}</div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem" }}>{u.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
