import { useState, useEffect, useCallback } from "react";
import { api, Entity, Topic, Source, AiPrompt, AgentKey, AgentSuggestion } from "@/lib/api";
import { useAuth } from "@/lib/auth";

// ─── Types ────────────────────────────────────────────────────────────────────
type AdminTab = "dashboard" | "entities" | "review" | "topics" | "generate" | "ontologie" | "sources" | "prompts" | "agents";

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
    { id: "sources", label: "Sources", icon: "📚" },
    { id: "prompts", label: "Prompts", icon: "✦" },
    { id: "agents", label: "Agents", icon: "🤖" },
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
        {tab === "sources" && <SourcesTab />}
        {tab === "prompts" && <PromptsTab />}
        {tab === "agents" && <AgentsTab />}
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

// ─── Sources Tab ──────────────────────────────────────────────────────────────
function SourcesTab() {
  const [sources, setSources] = useState<Source[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [importMode, setImportMode] = useState<"pmid" | "doi" | "batch" | null>(null);
  const [importValue, setImportValue] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [editSource, setEditSource] = useState<Source | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.sources.list({
      search: search || undefined,
      status: filterStatus !== "all" ? filterStatus : undefined,
      limit: "50",
    }).then((r) => {
      setSources(r.data);
      setTotal(r.total);
    }).finally(() => setLoading(false));
  }, [search, filterStatus]);

  useEffect(() => { load(); }, [load]);

  const handleImport = async () => {
    if (!importValue.trim()) return;
    setImportLoading(true);
    setImportResult(null);
    try {
      if (importMode === "pmid") {
        const r = await api.sources.importPmid(importValue.trim());
        setImportResult(r.imported ? `✅ Importiert: ${r.source.title}` : `ℹ️ Bereits vorhanden: ${r.source.title}`);
      } else if (importMode === "doi") {
        const r = await api.sources.importDoi(importValue.trim());
        setImportResult(r.imported ? `✅ Importiert: ${r.source.title}` : `ℹ️ Bereits vorhanden: ${r.source.title}`);
      } else if (importMode === "batch") {
        const lines = importValue.split("\n").map(l => l.trim()).filter(Boolean);
        const pmids = lines.filter(l => /^\d+$/.test(l));
        const dois = lines.filter(l => l.includes("/"));
        const r = await api.sources.importBatch(pmids, dois);
        setImportResult(`✅ ${r.imported} importiert, ❌ ${r.failed} fehlgeschlagen`);
      }
      load();
      setImportValue("");
    } catch (e: any) {
      setImportResult(`❌ Fehler: ${e.message}`);
    } finally {
      setImportLoading(false);
    }
  };

  const EVIDENCE_COLORS: Record<string, string> = {
    "1a": "#4ade80", "1b": "#86efac", "2a": "#fbbf24", "2b": "#f97316",
    "3": "#f87171", "4": "#a78bfa", "5": "#64748b",
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <SectionHeader title="Scientific Sources" subtitle={`${total} Quellen in der Datenbank`} />
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button onClick={() => setImportMode("pmid")} className="btn btn-outline" style={{ fontSize: "0.8125rem" }}>PMID Import</button>
          <button onClick={() => setImportMode("doi")} className="btn btn-outline" style={{ fontSize: "0.8125rem" }}>DOI Import</button>
          <button onClick={() => setImportMode("batch")} className="btn btn-gold" style={{ fontSize: "0.8125rem" }}>Batch Import</button>
        </div>
      </div>

      {/* Import Panel */}
      {importMode && (
        <div className="card" style={{ marginBottom: "1.5rem", padding: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <h3 style={{ color: "white", fontSize: "0.9375rem", fontFamily: "var(--font-condensed)", margin: 0 }}>
              {importMode === "pmid" ? "PubMed Import (PMID)" : importMode === "doi" ? "CrossRef Import (DOI)" : "Batch Import (PMIDs + DOIs)"}
            </h3>
            <button onClick={() => { setImportMode(null); setImportResult(null); }} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "1.25rem" }}>×</button>
          </div>
          {importMode === "batch" ? (
            <textarea
              value={importValue}
              onChange={(e) => setImportValue(e.target.value)}
              placeholder={"Eine PMID oder DOI pro Zeile:\n12345678\n10.1016/j.example.2024.01.001\n23456789"}
              className="form-input"
              style={{ width: "100%", height: "120px", resize: "vertical", fontFamily: "monospace", fontSize: "0.8125rem" }}
            />
          ) : (
            <input
              type="text"
              value={importValue}
              onChange={(e) => setImportValue(e.target.value)}
              placeholder={importMode === "pmid" ? "z.B. 12345678" : "z.B. 10.1016/j.example.2024.01.001"}
              className="form-input"
              style={{ width: "100%" }}
              onKeyDown={(e) => e.key === "Enter" && handleImport()}
            />
          )}
          {importResult && (
            <p style={{ marginTop: "0.75rem", fontSize: "0.875rem", color: importResult.startsWith("❌") ? "#f87171" : "#4ade80" }}>{importResult}</p>
          )}
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
            <button onClick={handleImport} disabled={importLoading || !importValue.trim()} className="btn btn-primary" style={{ fontSize: "0.875rem" }}>
              {importLoading ? "Importiere..." : "Importieren"}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Titel, Journal, PMID, DOI..."
          className="form-input"
          style={{ width: "280px", padding: "0.4rem 0.75rem", fontSize: "0.875rem" }}
        />
        <div style={{ display: "flex", gap: "0.375rem" }}>
          {["all", "draft", "review", "published"].map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`btn ${filterStatus === s ? "btn-primary" : "btn-outline"}`}
              style={{ fontSize: "0.8125rem", padding: "0.375rem 0.75rem" }}>
              {s === "all" ? "Alle" : s === "draft" ? "Entwurf" : s === "review" ? "Review" : "Live"}
            </button>
          ))}
        </div>
      </div>

      {/* Edit Panel */}
      {editSource && (
        <div className="card" style={{ marginBottom: "1.5rem", padding: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <h3 style={{ color: "white", fontSize: "0.9375rem", fontFamily: "var(--font-condensed)", margin: 0 }}>Source bearbeiten</h3>
            <button onClick={() => setEditSource(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "1.25rem" }}>×</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            {[
              { key: "title", label: "Titel", full: true },
              { key: "journal", label: "Journal" },
              { key: "year", label: "Jahr" },
              { key: "pmid", label: "PMID" },
              { key: "doi", label: "DOI" },
              { key: "evidenceLevel", label: "Evidenzlevel (1a–5)" },
              { key: "biasRisk", label: "Bias-Risiko" },
              { key: "fundingSource", label: "Finanzierung" },
            ].map((f) => (
              <div key={f.key} style={{ gridColumn: (f as any).full ? "1 / -1" : undefined }}>
                <label className="form-label">{f.label}</label>
                <input
                  type="text"
                  value={String((editSource as any)[f.key] ?? "")}
                  onChange={(e) => setEditSource({ ...editSource, [f.key]: e.target.value })}
                  className="form-input"
                  style={{ padding: "0.4rem 0.75rem", fontSize: "0.875rem" }}
                />
              </div>
            ))}
            <div style={{ gridColumn: "1 / -1" }}>
              <label className="form-label">KI-Zusammenfassung (DE)</label>
              <textarea
                value={editSource.aiSummaryDe ?? ""}
                onChange={(e) => setEditSource({ ...editSource, aiSummaryDe: e.target.value })}
                className="form-input"
                style={{ width: "100%", height: "100px", resize: "vertical", fontSize: "0.875rem" }}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
            <button onClick={async () => {
              await api.sources.update(editSource.id, editSource);
              setEditSource(null);
              load();
            }} className="btn btn-primary" style={{ fontSize: "0.875rem" }}>Speichern</button>
            <button onClick={async () => {
              if (!confirm("Source wirklich löschen?")) return;
              await api.sources.delete(editSource.id);
              setEditSource(null);
              load();
            }} className="btn btn-outline" style={{ fontSize: "0.875rem", color: "#f87171" }}>Löschen</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? <LoadingState /> : sources.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "rgba(255,255,255,0.3)" }}>
            Keine Quellen gefunden. Importiere PMIDs oder DOIs.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Titel", "Journal", "Jahr", "PMID/DOI", "Evidenz", "Status", ""].map((h) => (
                  <th key={h} style={{ padding: "0.625rem 0.875rem", textAlign: "left", fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.id} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={{ padding: "0.625rem 0.875rem", color: "rgba(255,255,255,0.85)", fontSize: "0.8125rem", maxWidth: "280px" }}>
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</div>
                    {s.authors && s.authors.length > 0 && (
                      <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.75rem", marginTop: "0.125rem" }}>
                        {s.authors.slice(0, 2).join(", ")}{s.authors.length > 2 ? " et al." : ""}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "0.625rem 0.875rem", color: "rgba(255,255,255,0.5)", fontSize: "0.8125rem" }}>{s.journal || "—"}</td>
                  <td style={{ padding: "0.625rem 0.875rem", color: "rgba(255,255,255,0.5)", fontSize: "0.8125rem" }}>{s.year || "—"}</td>
                  <td style={{ padding: "0.625rem 0.875rem", fontSize: "0.75rem", fontFamily: "monospace" }}>
                    {s.pmid && <a href={s.pubmedUrl || `https://pubmed.ncbi.nlm.nih.gov/${s.pmid}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-blue-bright)", textDecoration: "none" }}>PMID:{s.pmid}</a>}
                    {s.doi && !s.pmid && <a href={s.crossrefUrl || `https://doi.org/${s.doi}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-gold)", textDecoration: "none" }}>DOI</a>}
                  </td>
                  <td style={{ padding: "0.625rem 0.875rem" }}>
                    {s.evidenceLevel ? (
                      <span style={{ background: EVIDENCE_COLORS[s.evidenceLevel] || "rgba(255,255,255,0.1)", color: "#000", fontSize: "0.7rem", fontWeight: 700, padding: "0.125rem 0.5rem", borderRadius: "4px" }}>
                        {s.evidenceLevel}
                      </span>
                    ) : <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.75rem" }}>—</span>}
                  </td>
                  <td style={{ padding: "0.625rem 0.875rem" }}><StatusBadge status={s.status} /></td>
                  <td style={{ padding: "0.625rem 0.875rem" }}>
                    <button onClick={() => setEditSource(s)} className="btn btn-outline" style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}>Bearbeiten</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Prompts Tab ──────────────────────────────────────────────────────────────
function PromptsTab() {
  const [prompts, setPrompts] = useState<AiPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [editPrompt, setEditPrompt] = useState<AiPrompt | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newPrompt, setNewPrompt] = useState<Partial<AiPrompt>>({ language: "de", active: true, version: 1 });

  const PROMPT_TYPES = [
    { value: "knowledge_article", label: "Knowledge Article" },
    { value: "seo_meta", label: "SEO Meta" },
    { value: "faq", label: "FAQ" },
    { value: "study_summary", label: "Studienzusammenfassung" },
    { value: "geo_snippet", label: "GEO Snippet" },
    { value: "whatsapp", label: "WhatsApp" },
    { value: "json_ld", label: "JSON-LD" },
    { value: "relation_extraction", label: "Relation Extraction" },
    { value: "entity_classification", label: "Entity Classification" },
  ];

  const load = useCallback(() => {
    setLoading(true);
    api.prompts.list({ promptType: filterType !== "all" ? filterType : undefined, limit: "100" })
      .then((r) => setPrompts(r.data))
      .finally(() => setLoading(false));
  }, [filterType]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <SectionHeader title="Prompt Management" subtitle={`${prompts.length} Prompts — versioniert und auditierbar`} />
        <button onClick={() => setShowCreate(true)} className="btn btn-gold" style={{ fontSize: "0.8125rem" }}>+ Neuer Prompt</button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="card" style={{ marginBottom: "1.5rem", padding: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <h3 style={{ color: "white", fontSize: "0.9375rem", fontFamily: "var(--font-condensed)", margin: 0 }}>Neuer Prompt</h3>
            <button onClick={() => setShowCreate(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "1.25rem" }}>×</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div>
              <label className="form-label">Name</label>
              <input type="text" value={newPrompt.name ?? ""} onChange={(e) => setNewPrompt({ ...newPrompt, name: e.target.value })} className="form-input" />
            </div>
            <div>
              <label className="form-label">Slug (URL-Key)</label>
              <input type="text" value={newPrompt.slug ?? ""} onChange={(e) => setNewPrompt({ ...newPrompt, slug: e.target.value })} className="form-input" />
            </div>
            <div>
              <label className="form-label">Typ</label>
              <select value={newPrompt.promptType ?? ""} onChange={(e) => setNewPrompt({ ...newPrompt, promptType: e.target.value })} className="form-input">
                <option value="">Wählen...</option>
                {PROMPT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Ziel-Layer (L1–L7, optional)</label>
              <input type="text" value={newPrompt.targetLayer ?? ""} onChange={(e) => setNewPrompt({ ...newPrompt, targetLayer: e.target.value })} className="form-input" placeholder="z.B. L2" />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label className="form-label">System Prompt</label>
              <textarea value={newPrompt.systemPrompt ?? ""} onChange={(e) => setNewPrompt({ ...newPrompt, systemPrompt: e.target.value })} className="form-input" style={{ width: "100%", height: "100px", resize: "vertical", fontSize: "0.8125rem", fontFamily: "monospace" }} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label className="form-label">User Prompt Template (verwende {"{{variable}}"} für Variablen)</label>
              <textarea value={newPrompt.userPromptTemplate ?? ""} onChange={(e) => setNewPrompt({ ...newPrompt, userPromptTemplate: e.target.value })} className="form-input" style={{ width: "100%", height: "150px", resize: "vertical", fontSize: "0.8125rem", fontFamily: "monospace" }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
            <button onClick={async () => {
              await api.prompts.create(newPrompt);
              setShowCreate(false);
              setNewPrompt({ language: "de", active: true, version: 1 });
              load();
            }} className="btn btn-primary" style={{ fontSize: "0.875rem" }}>Erstellen</button>
          </div>
        </div>
      )}

      {/* Edit Panel */}
      {editPrompt && (
        <div className="card" style={{ marginBottom: "1.5rem", padding: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <h3 style={{ color: "white", fontSize: "0.9375rem", fontFamily: "var(--font-condensed)", margin: 0 }}>
              {editPrompt.name} <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.8125rem" }}>v{editPrompt.version}</span>
            </h3>
            <button onClick={() => setEditPrompt(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "1.25rem" }}>×</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div>
              <label className="form-label">Name</label>
              <input type="text" value={editPrompt.name} onChange={(e) => setEditPrompt({ ...editPrompt, name: e.target.value })} className="form-input" />
            </div>
            <div>
              <label className="form-label">Typ</label>
              <select value={editPrompt.promptType} onChange={(e) => setEditPrompt({ ...editPrompt, promptType: e.target.value })} className="form-input">
                {PROMPT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label className="form-label">System Prompt</label>
              <textarea value={editPrompt.systemPrompt} onChange={(e) => setEditPrompt({ ...editPrompt, systemPrompt: e.target.value })} className="form-input" style={{ width: "100%", height: "120px", resize: "vertical", fontSize: "0.8125rem", fontFamily: "monospace" }} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label className="form-label">User Prompt Template</label>
              <textarea value={editPrompt.userPromptTemplate} onChange={(e) => setEditPrompt({ ...editPrompt, userPromptTemplate: e.target.value })} className="form-input" style={{ width: "100%", height: "200px", resize: "vertical", fontSize: "0.8125rem", fontFamily: "monospace" }} />
            </div>
            <div>
              <label className="form-label">Beschreibung</label>
              <input type="text" value={editPrompt.description ?? ""} onChange={(e) => setEditPrompt({ ...editPrompt, description: e.target.value })} className="form-input" />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", paddingTop: "1.5rem" }}>
              <input type="checkbox" checked={editPrompt.active} onChange={(e) => setEditPrompt({ ...editPrompt, active: e.target.checked })} id="active-toggle" />
              <label htmlFor="active-toggle" style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.875rem" }}>Aktiv</label>
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
            <button onClick={async () => {
              await api.prompts.update(editPrompt.id, editPrompt);
              setEditPrompt(null);
              load();
            }} className="btn btn-primary" style={{ fontSize: "0.875rem" }}>Speichern (neue Version)</button>
          </div>
        </div>
      )}

      {/* Filter */}
      <div style={{ display: "flex", gap: "0.375rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        <button onClick={() => setFilterType("all")} className={`btn ${filterType === "all" ? "btn-primary" : "btn-outline"}`} style={{ fontSize: "0.8125rem", padding: "0.375rem 0.75rem" }}>Alle</button>
        {PROMPT_TYPES.map((t) => (
          <button key={t.value} onClick={() => setFilterType(t.value)} className={`btn ${filterType === t.value ? "btn-primary" : "btn-outline"}`} style={{ fontSize: "0.8125rem", padding: "0.375rem 0.75rem" }}>{t.label}</button>
        ))}
      </div>

      {/* List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {loading ? <LoadingState /> : prompts.length === 0 ? (
          <div className="card" style={{ padding: "3rem", textAlign: "center", color: "rgba(255,255,255,0.3)" }}>Keine Prompts gefunden.</div>
        ) : prompts.map((p) => (
          <div key={p.id} className="card" style={{ padding: "1rem", display: "flex", alignItems: "flex-start", gap: "1rem" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.375rem" }}>
                <span style={{ color: "white", fontWeight: 600, fontSize: "0.9375rem" }}>{p.name}</span>
                <span style={{ background: "rgba(37,99,235,0.2)", color: "var(--color-blue-bright)", fontSize: "0.7rem", padding: "0.125rem 0.5rem", borderRadius: "4px", fontFamily: "monospace" }}>{p.promptType}</span>
                {p.targetLayer && <span style={{ background: "rgba(251,191,36,0.15)", color: "var(--color-gold)", fontSize: "0.7rem", padding: "0.125rem 0.5rem", borderRadius: "4px" }}>{p.targetLayer}</span>}
                <span style={{ background: p.active ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.08)", color: p.active ? "#4ade80" : "rgba(255,255,255,0.3)", fontSize: "0.7rem", padding: "0.125rem 0.5rem", borderRadius: "4px" }}>v{p.version} {p.active ? "aktiv" : "inaktiv"}</span>
              </div>
              {p.description && <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8125rem", margin: 0 }}>{p.description}</p>}
              <div style={{ marginTop: "0.5rem", background: "rgba(0,0,0,0.3)", borderRadius: "6px", padding: "0.5rem 0.75rem", fontFamily: "monospace", fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", maxHeight: "60px", overflow: "hidden" }}>
                {p.userPromptTemplate.substring(0, 200)}...
              </div>
            </div>
            <button onClick={() => setEditPrompt(p)} className="btn btn-outline" style={{ fontSize: "0.75rem", padding: "0.25rem 0.625rem", flexShrink: 0 }}>Bearbeiten</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Agents Tab ───────────────────────────────────────────────────────────────
function AgentsTab() {
  const [keys, setKeys] = useState<AgentKey[]>([]);
  const [suggestions, setSuggestions] = useState<AgentSuggestion[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [subTab, setSubTab] = useState<"keys" | "suggestions" | "logs">("keys");
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [newKey, setNewKey] = useState({ name: "", agentRole: "reader", canRead: true, canSuggest: false, canWrite: false, description: "" });
  const [newKeyResult, setNewKeyResult] = useState<{ rawKey: string; warning: string } | null>(null);
  const [filterSuggestions, setFilterSuggestions] = useState("pending");

  const loadKeys = useCallback(() => {
    setLoadingKeys(true);
    api.agents.listKeys().then(setKeys).finally(() => setLoadingKeys(false));
  }, []);

  const loadSuggestions = useCallback(() => {
    setLoadingSuggestions(true);
    api.agents.listSuggestions({ status: filterSuggestions }).then((r) => setSuggestions(r.data)).finally(() => setLoadingSuggestions(false));
  }, [filterSuggestions]);

  useEffect(() => { loadKeys(); }, [loadKeys]);
  useEffect(() => { if (subTab === "suggestions") loadSuggestions(); }, [subTab, loadSuggestions]);

  const AGENT_ROLES = [
    { value: "reader", label: "Reader — nur lesen" },
    { value: "content_agent", label: "Content Agent — Inhalte vorschlagen" },
    { value: "research_agent", label: "Research Agent — Studien importieren" },
    { value: "relation_agent", label: "Relation Agent — Verbindungen vorschlagen" },
    { value: "admin_agent", label: "Admin Agent — voller Zugriff" },
  ];

  return (
    <div>
      <SectionHeader title="Agent Architecture" subtitle="API-Keys, Berechtigungen und Suggestion Review Queue" />

      {/* Sub-Tabs */}
      <div style={{ display: "flex", gap: "0.375rem", marginBottom: "1.5rem" }}>
        {[
          { id: "keys" as const, label: "API Keys", count: keys.length },
          { id: "suggestions" as const, label: "Suggestions", count: suggestions.length },
          { id: "logs" as const, label: "Access Log" },
        ].map((t) => (
          <button key={t.id} onClick={() => setSubTab(t.id)}
            className={`btn ${subTab === t.id ? "btn-primary" : "btn-outline"}`}
            style={{ fontSize: "0.8125rem", padding: "0.375rem 0.875rem" }}>
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span style={{ marginLeft: "0.375rem", background: "rgba(255,255,255,0.15)", borderRadius: "10px", padding: "0.1rem 0.4rem", fontSize: "0.7rem" }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* API Keys */}
      {subTab === "keys" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
            <button onClick={() => setShowCreateKey(true)} className="btn btn-gold" style={{ fontSize: "0.8125rem" }}>+ Neuer API Key</button>
          </div>

          {/* New Key Result */}
          {newKeyResult && (
            <div className="card" style={{ marginBottom: "1.5rem", padding: "1.25rem", border: "1px solid rgba(74,222,128,0.3)" }}>
              <h3 style={{ color: "#4ade80", fontSize: "0.9375rem", marginBottom: "0.75rem" }}>✅ API Key erstellt — einmalig sichtbar!</h3>
              <div style={{ background: "rgba(0,0,0,0.4)", borderRadius: "6px", padding: "0.75rem", fontFamily: "monospace", fontSize: "0.875rem", color: "white", wordBreak: "break-all" }}>
                {newKeyResult.rawKey}
              </div>
              <p style={{ color: "#f87171", fontSize: "0.8125rem", marginTop: "0.5rem" }}>{newKeyResult.warning}</p>
              <button onClick={() => setNewKeyResult(null)} className="btn btn-outline" style={{ marginTop: "0.75rem", fontSize: "0.8125rem" }}>Verstanden — schließen</button>
            </div>
          )}

          {/* Create Form */}
          {showCreateKey && (
            <div className="card" style={{ marginBottom: "1.5rem", padding: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                <h3 style={{ color: "white", fontSize: "0.9375rem", fontFamily: "var(--font-condensed)", margin: 0 }}>Neuer Agent API Key</h3>
                <button onClick={() => setShowCreateKey(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "1.25rem" }}>×</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label className="form-label">Name (z.B. "Content Agent v1")</label>
                  <input type="text" value={newKey.name} onChange={(e) => setNewKey({ ...newKey, name: e.target.value })} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Rolle</label>
                  <select value={newKey.agentRole} onChange={(e) => setNewKey({ ...newKey, agentRole: e.target.value })} className="form-input">
                    {AGENT_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label className="form-label">Beschreibung</label>
                  <input type="text" value={newKey.description} onChange={(e) => setNewKey({ ...newKey, description: e.target.value })} className="form-input" placeholder="Wofür wird dieser Key verwendet?" />
                </div>
                <div style={{ display: "flex", gap: "1.5rem", gridColumn: "1 / -1" }}>
                  {[
                    { key: "canRead", label: "Lesen" },
                    { key: "canSuggest", label: "Vorschlagen" },
                    { key: "canWrite", label: "Schreiben" },
                  ].map((p) => (
                    <label key={p.key} style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                      <input type="checkbox" checked={(newKey as any)[p.key]} onChange={(e) => setNewKey({ ...newKey, [p.key]: e.target.checked })} />
                      <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.875rem" }}>{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button onClick={async () => {
                const r = await api.agents.createKey(newKey);
                setNewKeyResult({ rawKey: r.rawKey, warning: r.warning });
                setShowCreateKey(false);
                setNewKey({ name: "", agentRole: "reader", canRead: true, canSuggest: false, canWrite: false, description: "" });
                loadKeys();
              }} className="btn btn-primary" style={{ marginTop: "1rem", fontSize: "0.875rem" }}>Key erstellen</button>
            </div>
          )}

          {/* Keys Table */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {loadingKeys ? <LoadingState /> : keys.length === 0 ? (
              <div style={{ padding: "3rem", textAlign: "center", color: "rgba(255,255,255,0.3)" }}>Noch keine API Keys erstellt.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Name", "Rolle", "Berechtigungen", "Anfragen", "Zuletzt aktiv", "Status", ""].map((h) => (
                      <th key={h} style={{ padding: "0.625rem 0.875rem", textAlign: "left", fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {keys.map((k) => (
                    <tr key={k.id} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                      <td style={{ padding: "0.625rem 0.875rem" }}>
                        <div style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.875rem" }}>{k.name}</div>
                        {k.description && <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.75rem" }}>{k.description}</div>}
                      </td>
                      <td style={{ padding: "0.625rem 0.875rem" }}>
                        <span style={{ background: "rgba(37,99,235,0.2)", color: "var(--color-blue-bright)", fontSize: "0.7rem", padding: "0.125rem 0.5rem", borderRadius: "4px", fontFamily: "monospace" }}>{k.agentRole}</span>
                      </td>
                      <td style={{ padding: "0.625rem 0.875rem" }}>
                        <div style={{ display: "flex", gap: "0.25rem" }}>
                          {k.canRead && <span style={{ background: "rgba(74,222,128,0.15)", color: "#4ade80", fontSize: "0.65rem", padding: "0.1rem 0.375rem", borderRadius: "3px" }}>R</span>}
                          {k.canSuggest && <span style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24", fontSize: "0.65rem", padding: "0.1rem 0.375rem", borderRadius: "3px" }}>S</span>}
                          {k.canWrite && <span style={{ background: "rgba(248,113,113,0.15)", color: "#f87171", fontSize: "0.65rem", padding: "0.1rem 0.375rem", borderRadius: "3px" }}>W</span>}
                        </div>
                      </td>
                      <td style={{ padding: "0.625rem 0.875rem", color: "rgba(255,255,255,0.5)", fontSize: "0.8125rem" }}>{k.requestCount}</td>
                      <td style={{ padding: "0.625rem 0.875rem", color: "rgba(255,255,255,0.3)", fontSize: "0.8125rem" }}>
                        {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString("de-DE") : "Nie"}
                      </td>
                      <td style={{ padding: "0.625rem 0.875rem" }}>
                        <span style={{ background: k.active ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.08)", color: k.active ? "#4ade80" : "rgba(255,255,255,0.3)", fontSize: "0.7rem", padding: "0.125rem 0.5rem", borderRadius: "4px" }}>
                          {k.active ? "Aktiv" : "Inaktiv"}
                        </span>
                      </td>
                      <td style={{ padding: "0.625rem 0.875rem" }}>
                        {k.active && (
                          <button onClick={async () => {
                            if (!confirm(`Key "${k.name}" wirklich deaktivieren?`)) return;
                            await api.agents.revokeKey(k.id);
                            loadKeys();
                          }} className="btn btn-outline" style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem", color: "#f87171" }}>Deaktivieren</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {subTab === "suggestions" && (
        <div>
          <div style={{ display: "flex", gap: "0.375rem", marginBottom: "1.25rem" }}>
            {["pending", "under_review", "approved", "rejected", "all"].map((s) => (
              <button key={s} onClick={() => setFilterSuggestions(s)}
                className={`btn ${filterSuggestions === s ? "btn-primary" : "btn-outline"}`}
                style={{ fontSize: "0.8125rem", padding: "0.375rem 0.75rem" }}>
                {s === "pending" ? "Ausstehend" : s === "under_review" ? "In Review" : s === "approved" ? "Genehmigt" : s === "rejected" ? "Abgelehnt" : "Alle"}
              </button>
            ))}
          </div>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {loadingSuggestions ? <LoadingState /> : suggestions.length === 0 ? (
              <div style={{ padding: "3rem", textAlign: "center", color: "rgba(255,255,255,0.3)" }}>Keine Suggestions in diesem Status.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Typ", "Agent", "Ziel", "Konfidenz", "Status", "Erstellt", ""].map((h) => (
                      <th key={h} style={{ padding: "0.625rem 0.875rem", textAlign: "left", fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {suggestions.map((s) => (
                    <tr key={s.id} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                      <td style={{ padding: "0.625rem 0.875rem" }}>
                        <span style={{ background: "rgba(37,99,235,0.2)", color: "var(--color-blue-bright)", fontSize: "0.7rem", padding: "0.125rem 0.5rem", borderRadius: "4px", fontFamily: "monospace" }}>{s.suggestionType}</span>
                      </td>
                      <td style={{ padding: "0.625rem 0.875rem", color: "rgba(255,255,255,0.5)", fontSize: "0.8125rem" }}>{s.agentRole}</td>
                      <td style={{ padding: "0.625rem 0.875rem", color: "rgba(255,255,255,0.5)", fontFamily: "monospace", fontSize: "0.75rem" }}>{s.targetEntityId?.substring(0, 8)}...</td>
                      <td style={{ padding: "0.625rem 0.875rem" }}>
                        {s.confidence !== undefined && (
                          <span style={{ color: s.confidence > 0.8 ? "#4ade80" : s.confidence > 0.5 ? "#fbbf24" : "#f87171", fontSize: "0.8125rem" }}>
                            {Math.round(s.confidence * 100)}%
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "0.625rem 0.875rem" }}><StatusBadge status={s.status} /></td>
                      <td style={{ padding: "0.625rem 0.875rem", color: "rgba(255,255,255,0.3)", fontSize: "0.8125rem" }}>
                        {new Date(s.createdAt).toLocaleDateString("de-DE")}
                      </td>
                      <td style={{ padding: "0.625rem 0.875rem" }}>
                        {s.status === "pending" && (
                          <div style={{ display: "flex", gap: "0.375rem" }}>
                            <button onClick={async () => {
                              await api.agents.reviewSuggestion(s.id, { status: "approved", reviewedBy: "admin" });
                              loadSuggestions();
                            }} className="btn btn-outline" style={{ fontSize: "0.7rem", padding: "0.2rem 0.5rem", color: "#4ade80" }}>✓</button>
                            <button onClick={async () => {
                              await api.agents.reviewSuggestion(s.id, { status: "rejected", reviewedBy: "admin" });
                              loadSuggestions();
                            }} className="btn btn-outline" style={{ fontSize: "0.7rem", padding: "0.2rem 0.5rem", color: "#f87171" }}>✗</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Logs */}
      {subTab === "logs" && (
        <div className="card" style={{ padding: "1.5rem", textAlign: "center", color: "rgba(255,255,255,0.3)" }}>
          <p>Access Logs werden in Kürze implementiert.</p>
          <p style={{ fontSize: "0.8125rem", marginTop: "0.5rem" }}>Alle API-Anfragen werden in der Datenbank protokolliert.</p>
        </div>
      )}
    </div>
  );
}
