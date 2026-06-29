import { useState, useEffect } from "react";
import { api, Topic, Entity } from "@/lib/api";
import { ArrowLeft, FlaskConical, Dna, Zap, Heart, Microscope, Leaf, BookOpen, Search } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  compound: "Compound",
  peptide: "Peptid",
  supplement: "Supplement",
  mechanism: "Mechanismus",
  receptor: "Rezeptor",
  gene: "Gen",
  organ: "Organ",
  disease: "Erkrankung",
  stack: "Stack",
  guide: "Guide",
  glossary: "Glossar",
  faq: "FAQ",
  academy_module: "Academy",
};

function EntityCard({ entity }: { entity: Entity }) {
  const slug = entity.slug ?? entity.id;
  return (
    <a
      href={`/wissen/${slug}`}
      className="group flex flex-col gap-2 p-4 bg-navy-light border border-white/5 rounded-xl hover:border-blue/40 hover:bg-blue/5 transition-all duration-200"
    >
      <div className="flex items-center gap-2">
        <span className="text-xs text-blue-bright bg-blue/10 px-2 py-0.5 rounded font-mono uppercase tracking-wide">
          {TYPE_LABELS[entity.type] ?? entity.type}
        </span>
      </div>
      <h3 className="text-white font-semibold text-sm group-hover:text-blue-bright transition-colors">
        {entity.canonicalName}
      </h3>
      {entity.shortDescription && (
        <p className="text-gray-500 text-xs line-clamp-2 leading-relaxed">{entity.shortDescription}</p>
      )}
      {entity.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {entity.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-xs text-gray-600 bg-white/5 px-2 py-0.5 rounded">
              {tag}
            </span>
          ))}
        </div>
      )}
    </a>
  );
}

export default function TopicPage({ topicSlug }: { topicSlug: string }) {
  const [topic, setTopic] = useState<Topic | null>(null);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [filtered, setFiltered] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState<string>("all");

  useEffect(() => {
    async function load() {
      try {
        const res = await api.topics.get(topicSlug, { limit: "100" });
        setTopic(res.topic);
        setEntities(res.entities);
        setFiltered(res.entities);
      } catch (err: any) {
        setError(err.message ?? "Thema nicht gefunden");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [topicSlug]);

  // Filter logic
  useEffect(() => {
    let result = entities;
    if (activeType !== "all") {
      result = result.filter((e) => e.type === activeType);
    }
    if (search.trim().length >= 2) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.canonicalName.toLowerCase().includes(q) ||
          e.shortDescription?.toLowerCase().includes(q) ||
          e.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    setFiltered(result);
  }, [search, activeType, entities]);

  const types = Array.from(new Set(entities.map((e) => e.type)));

  if (loading) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-bright border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !topic) {
    return (
      <div className="min-h-screen bg-navy flex flex-col items-center justify-center text-center px-4">
        <BookOpen size={48} className="text-gray-700 mb-4" />
        <h1 className="text-white text-xl font-bold mb-2">Thema nicht gefunden</h1>
        <p className="text-gray-500 text-sm mb-6">{error}</p>
        <a href="/" className="btn-primary px-6 py-2 rounded-lg text-sm">Zur Startseite</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-30 border-b border-white/5 bg-navy/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-gradient-to-br from-blue-mid to-blue-bright flex items-center justify-center">
              <span className="text-white font-bold text-xs">369</span>
            </div>
            <span className="text-white font-semibold text-sm">Research</span>
          </a>
          <a href="/" className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={14} /> Übersicht
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/5">
        <div
          className="absolute inset-0 opacity-5"
          style={{ background: `radial-gradient(ellipse at 50% 0%, ${topic.color ?? "#2563eb"}, transparent 70%)` }}
        />
        <div className="relative max-w-6xl mx-auto px-4 py-12">
          <a href="/" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 mb-4 transition-colors">
            <ArrowLeft size={12} /> Alle Themen
          </a>
          <div className="flex items-start gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${topic.color ?? "#2563eb"}15`, border: `1px solid ${topic.color ?? "#2563eb"}30` }}
            >
              <BookOpen size={22} style={{ color: topic.color ?? "#3b82f6" }} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{topic.name}</h1>
              {topic.nameEn && <p className="text-gray-500 text-sm mt-0.5">{topic.nameEn}</p>}
              {topic.description && (
                <p className="text-gray-400 text-sm mt-3 max-w-2xl leading-relaxed">{topic.description}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Filters + Content */}
      <section className="max-w-6xl mx-auto px-4 py-8">
        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtern…"
              className="w-full pl-9 pr-4 py-2.5 bg-navy-light border border-white/10 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue/40"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActiveType("all")}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeType === "all"
                  ? "bg-blue text-white"
                  : "bg-navy-light text-gray-400 hover:text-white border border-white/10"
              }`}
            >
              Alle ({entities.length})
            </button>
            {types.map((type) => (
              <button
                key={type}
                onClick={() => setActiveType(type)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  activeType === type
                    ? "bg-blue text-white"
                    : "bg-navy-light text-gray-400 hover:text-white border border-white/10"
                }`}
              >
                {TYPE_LABELS[type] ?? type} ({entities.filter((e) => e.type === type).length})
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((entity) => (
              <EntityCard key={entity.id} entity={entity} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-600">
            <BookOpen size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              {search || activeType !== "all"
                ? "Keine Einträge für diese Filter."
                : "Noch keine Inhalte in diesem Themengebiet."}
            </p>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-8">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <p className="text-gray-700 text-xs text-center">
            Research Use Only. Not for human use. Alle Inhalte dienen ausschließlich Forschungszwecken.
          </p>
        </div>
      </footer>
    </div>
  );
}
