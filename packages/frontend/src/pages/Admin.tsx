import { useState, useEffect } from "react";
import { api, Entity } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function Admin() {
  const { isAdmin, login, logout } = useAuth();

  if (!isAdmin) return <LoginScreen onLogin={login} />;
  return <AdminDashboard onLogout={logout} />;
}

// ─── Login Screen ─────────────────────────────────────────────────────────────

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

// ─── Admin Dashboard ──────────────────────────────────────────────────────────

type AdminView = "list" | "create" | "edit";

function AdminDashboard({ onLogout }: { onLogout: () => Promise<void> }) {
  const [view, setView] = useState<AdminView>("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");

  const loadEntities = () => {
    setLoading(true);
    api.entities
      .list()
      .then((r) => setEntities(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadEntities(); }, []);

  const filtered = filterStatus === "all" ? entities : entities.filter((e) => e.status === filterStatus);

  const stats = {
    total: entities.length,
    published: entities.filter((e) => e.status === "published").length,
    draft: entities.filter((e) => e.status === "draft").length,
    review: entities.filter((e) => e.status === "review").length,
  };

  if (view === "create") {
    return <EntityForm onSave={() => { loadEntities(); setView("list"); }} onCancel={() => setView("list")} />;
  }

  if (view === "edit" && selectedId) {
    return <EntityForm entityId={selectedId} onSave={() => { loadEntities(); setView("list"); }} onCancel={() => setView("list")} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a" }}>
      {/* Top Bar */}
      <div style={{ background: "var(--color-navy)", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "0 1.5rem", height: "60px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <img
            src="https://369academy-pbxbt3uf.manus.space/manus-storage/369-research-logo_7c3bb4da.png"
            alt="369 Research"
            style={{ height: "32px", width: "auto", objectFit: "contain" }}
          />
          <span style={{ fontFamily: "var(--font-condensed)", fontWeight: 700, color: "white" }}>Knowledge Admin</span>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <a href="/" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8125rem", textDecoration: "none" }}>
            Portal ansehen →
          </a>
          <button onClick={onLogout} className="btn btn-outline" style={{ fontSize: "0.8125rem", padding: "0.375rem 0.875rem" }}>
            Abmelden
          </button>
        </div>
      </div>

      <div style={{ padding: "2rem 1.5rem", maxWidth: "1200px", margin: "0 auto" }}>
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
          {[
            { label: "Gesamt", value: stats.total, color: "var(--color-blue-bright)" },
            { label: "Veröffentlicht", value: stats.published, color: "#4ade80" },
            { label: "Entwurf", value: stats.draft, color: "rgba(255,255,255,0.5)" },
            { label: "In Review", value: stats.review, color: "var(--color-gold)" },
          ].map((s) => (
            <div key={s.label} className="card" style={{ textAlign: "center", padding: "1.25rem" }}>
              <div style={{ fontSize: "2rem", fontWeight: 800, fontFamily: "var(--font-condensed)", color: s.color }}>{s.value}</div>
              <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {["all", "draft", "review", "published"].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`btn ${filterStatus === s ? "btn-primary" : "btn-outline"}`}
                style={{ fontSize: "0.8125rem", padding: "0.4rem 0.875rem" }}
              >
                {s === "all" ? "Alle" : s === "draft" ? "Entwurf" : s === "review" ? "Review" : "Live"}
              </button>
            ))}
          </div>
          <button onClick={() => setView("create")} className="btn btn-gold">
            + Neuer Eintrag
          </button>
        </div>

        {/* Table */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "rgba(255,255,255,0.4)" }}>Lade...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "rgba(255,255,255,0.4)" }}>
              Keine Einträge. <button onClick={() => setView("create")} style={{ background: "none", border: "none", color: "var(--color-blue-bright)", cursor: "pointer" }}>Ersten Eintrag erstellen →</button>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  {["Name", "Typ", "Status", "Aktualisiert", "Aktionen"].map((h) => (
                    <th key={h} style={{ padding: "0.875rem 1.25rem", textAlign: "left", fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((entity) => (
                  <EntityRow
                    key={entity.id}
                    entity={entity}
                    onEdit={() => { setSelectedId(entity.id); setView("edit"); }}
                    onPublish={async () => { await api.entities.publish(entity.id); loadEntities(); }}
                    onUnpublish={async () => { await api.entities.unpublish(entity.id); loadEntities(); }}
                    onDelete={async () => { if (confirm("Wirklich löschen?")) { await api.entities.delete(entity.id); loadEntities(); } }}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function EntityRow({ entity, onEdit, onPublish, onUnpublish, onDelete }: {
  entity: Entity;
  onEdit: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onDelete: () => void;
}) {
  const statusColors: Record<string, string> = {
    draft: "rgba(255,255,255,0.4)",
    review: "var(--color-gold)",
    published: "#4ade80",
    archived: "rgba(255,255,255,0.2)",
  };

  return (
    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <td style={{ padding: "0.875rem 1.25rem" }}>
        <span style={{ color: "white", fontWeight: 500 }}>{entity.canonicalName}</span>
      </td>
      <td style={{ padding: "0.875rem 1.25rem" }}>
        <span className="badge badge-blue" style={{ fontSize: "0.7rem" }}>{entity.type}</span>
      </td>
      <td style={{ padding: "0.875rem 1.25rem" }}>
        <span style={{ color: statusColors[entity.status] ?? "white", fontSize: "0.8125rem", fontWeight: 600 }}>
          {entity.status === "draft" ? "Entwurf" : entity.status === "review" ? "Review" : entity.status === "published" ? "Live" : "Archiviert"}
        </span>
      </td>
      <td style={{ padding: "0.875rem 1.25rem", color: "rgba(255,255,255,0.4)", fontSize: "0.8125rem" }}>
        {new Date(entity.updatedAt).toLocaleDateString("de-DE")}
      </td>
      <td style={{ padding: "0.875rem 1.25rem" }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button onClick={onEdit} className="btn btn-outline" style={{ fontSize: "0.75rem", padding: "0.3rem 0.75rem" }}>Bearbeiten</button>
          {entity.status !== "published" ? (
            <button onClick={onPublish} className="btn btn-primary" style={{ fontSize: "0.75rem", padding: "0.3rem 0.75rem" }}>Freigeben</button>
          ) : (
            <button onClick={onUnpublish} style={{ fontSize: "0.75rem", padding: "0.3rem 0.75rem", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "6px", color: "rgba(255,255,255,0.5)", cursor: "pointer" }}>Zurückziehen</button>
          )}
          <button onClick={onDelete} style={{ fontSize: "0.75rem", padding: "0.3rem 0.75rem", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "6px", color: "#f87171", cursor: "pointer" }}>Löschen</button>
        </div>
      </td>
    </tr>
  );
}

// ─── Entity Form (Create/Edit) ────────────────────────────────────────────────

function EntityForm({ entityId, onSave, onCancel }: { entityId?: string; onSave: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    canonicalName: "",
    type: "compound",
    seoDescription: "",
    tags: "",
    casNumber: "",
  });
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatedBlocks, setGeneratedBlocks] = useState<any[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (entityId) {
      api.entities.get(entityId).then(({ entity, blocks }) => {
        setForm({
          canonicalName: entity.canonicalName,
          type: entity.type,
          seoDescription: entity.seoDescription ?? "",
          tags: entity.tags.join(", "),
          casNumber: entity.casNumber ?? "",
        });
        setGeneratedBlocks(blocks);
      });
    }
  }, [entityId]);

  const handleGenerate = async () => {
    if (!form.canonicalName) { setError("Name erforderlich"); return; }
    setGenerating(true);
    setError("");
    try {
      let id = entityId;
      if (!id) {
        const res = await api.entities.create({
          id: crypto.randomUUID(),
          canonicalName: form.canonicalName,
          type: form.type,
          seoDescription: form.seoDescription || undefined,
          tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
          casNumber: form.casNumber || undefined,
        });
        id = res.entity.id;
      }
      const res = await api.entities.generate(id!);
      setGeneratedBlocks(res.blocks);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (entityId) {
        await api.entities.update(entityId, {
          canonicalName: form.canonicalName,
          seoDescription: form.seoDescription || undefined,
          tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
          casNumber: form.casNumber || undefined,
        });
      }
      onSave();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const ENTITY_TYPES = [
    { value: "compound", label: "Compound / Peptid" },
    { value: "guide", label: "Praxis-Guide" },
    { value: "stack", label: "Stack" },
    { value: "steroid", label: "Steroid" },
    { value: "supplement", label: "Supplement" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a" }}>
      {/* Top Bar */}
      <div style={{ background: "var(--color-navy)", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "0 1.5rem", height: "60px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h3 style={{ color: "white", fontFamily: "var(--font-condensed)" }}>
          {entityId ? "Eintrag bearbeiten" : "Neuer Eintrag"}
        </h3>
        <button onClick={onCancel} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: "0.875rem" }}>
          ← Zurück
        </button>
      </div>

      <div style={{ padding: "2rem 1.5rem", maxWidth: "800px", margin: "0 auto" }}>
        {/* Form */}
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <h4 style={{ color: "white", marginBottom: "1.5rem", fontFamily: "var(--font-condensed)" }}>Grunddaten</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label className="form-label">Name *</label>
              <input
                type="text"
                value={form.canonicalName}
                onChange={(e) => setForm({ ...form, canonicalName: e.target.value })}
                className="form-input"
                placeholder="z.B. BPC-157"
              />
            </div>
            <div>
              <label className="form-label">Typ *</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="form-input"
              >
                {ENTITY_TYPES.map((t) => (
                  <option key={t.value} value={t.value} style={{ background: "#0a1628" }}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label className="form-label">CAS-Nummer (optional)</label>
            <input
              type="text"
              value={form.casNumber}
              onChange={(e) => setForm({ ...form, casNumber: e.target.value })}
              className="form-input"
              placeholder="z.B. 137525-51-0"
            />
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label className="form-label">SEO-Beschreibung (optional — KI füllt aus)</label>
            <textarea
              value={form.seoDescription}
              onChange={(e) => setForm({ ...form, seoDescription: e.target.value })}
              className="form-input"
              rows={3}
              placeholder="Kurzbeschreibung für Suchmaschinen..."
            />
          </div>
          <div>
            <label className="form-label">Tags (kommagetrennt)</label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              className="form-input"
              placeholder="z.B. Regeneration, Wundheilung, Entzündung"
            />
          </div>
        </div>

        {error && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", padding: "0.875rem 1rem", marginBottom: "1rem", color: "#f87171", fontSize: "0.875rem" }}>
            {error}
          </div>
        )}

        {/* AI Generate */}
        <div className="card" style={{ marginBottom: "1.5rem", borderColor: "rgba(37,99,235,0.3)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <div>
              <h4 style={{ color: "white", fontFamily: "var(--font-condensed)" }}>KI-Generierung</h4>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8125rem", marginTop: "0.25rem" }}>
                KI erstellt alle Texte, Mechanismen, FAQ und Quellen automatisch.
              </p>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating || !form.canonicalName}
              className="btn btn-primary"
              style={{ minWidth: "160px" }}
            >
              {generating ? (
                <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span>
                  Generiere...
                </span>
              ) : "✨ KI generieren"}
            </button>
          </div>

          {generatedBlocks.length > 0 && (
            <div>
              <div style={{ fontSize: "0.8125rem", color: "#4ade80", marginBottom: "0.75rem" }}>
                ✓ {generatedBlocks.length} Blöcke generiert — bitte prüfen vor der Freigabe
              </div>
              <div style={{ maxHeight: "300px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {generatedBlocks.map((b) => (
                  <div key={b.id} style={{ background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "0.75rem 1rem" }}>
                    <div style={{ fontSize: "0.7rem", color: "var(--color-gold)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>
                      {b.blockType} · {b.layer}
                    </div>
                    {b.title && <div style={{ color: "white", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.25rem" }}>{b.title}</div>}
                    <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8125rem", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {b.body}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <button onClick={onCancel} className="btn btn-outline">Abbrechen</button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary">
            {saving ? "Speichern..." : "Speichern"}
          </button>
        </div>

        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.75rem", textAlign: "center", marginTop: "1rem" }}>
          Gespeicherte Einträge bleiben als Entwurf — erst nach manueller Freigabe in der Übersicht werden sie öffentlich sichtbar.
        </p>
      </div>
    </div>
  );
}
