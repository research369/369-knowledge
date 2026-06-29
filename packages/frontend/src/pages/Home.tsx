import { useState, useEffect } from "react";
import { api, Topic, Entity } from "@/lib/api";
import { Search, ChevronRight, FlaskConical, Dna, Zap, Heart, Microscope, Leaf, BookOpen, ArrowRight } from "lucide-react";

// ─── Icon map for topics ──────────────────────────────────────────────────────
const TOPIC_ICONS: Record<string, React.ReactNode> = {
  longevity: <Heart size={22} />,
  mitochondrien: <Zap size={22} />,
  peptide: <Dna size={22} />,
  fettverlust: <FlaskConical size={22} />,
  muskelaufbau: <Zap size={22} />,
  hautpflege: <Leaf size={22} />,
  hormone: <Microscope size={22} />,
  default: <BookOpen size={22} />,
};

function getTopicIcon(slug: string) {
  return TOPIC_ICONS[slug] ?? TOPIC_ICONS.default;
}

// ─── Age Gate ─────────────────────────────────────────────────────────────────
function AgeGate({ onConfirm }: { onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/95 backdrop-blur-sm p-4">
      <div className="max-w-md w-full bg-navy-light border border-blue/30 rounded-2xl p-8 text-center shadow-2xl">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-blue/10 border border-blue/30 flex items-center justify-center">
          <FlaskConical size={28} className="text-gold" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">Zugang bestätigen</h2>
        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
          Diese Plattform enthält wissenschaftliche Informationen zu Research Compounds.
          Der Zugang ist ausschließlich für Personen über 18 Jahre zu Forschungszwecken bestimmt.
        </p>
        <div className="bg-blue/10 border border-blue/20 rounded-lg p-4 mb-6 text-left">
          <p className="text-xs text-gray-400 leading-relaxed">
            <span className="text-gold font-semibold">Research Use Only.</span> Alle Inhalte dienen
            ausschließlich wissenschaftlichen und Forschungszwecken. Keine der dargestellten
            Informationen stellt medizinischen Rat dar.
          </p>
        </div>
        <button
          onClick={onConfirm}
          className="w-full btn-primary py-3 rounded-xl font-semibold text-base"
        >
          Ich bin über 18 Jahre alt und nutze diese Seite zu Forschungszwecken
        </button>
      </div>
    </div>
  );
}

// ─── Search Bar ───────────────────────────────────────────────────────────────
function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.search.query(query, { limit: 8 });
        setResults(res.data);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (entity: Entity) => {
    const slug = entity.slug ?? entity.id;
    window.location.href = `/wissen/${slug}`;
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Compound, Mechanismus, Thema suchen…"
          className="w-full pl-12 pr-4 py-4 bg-navy-light border border-blue/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-bright text-sm"
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-blue-bright border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-navy-light border border-blue/30 rounded-xl shadow-2xl z-40 overflow-hidden">
          {results.map((entity) => (
            <button
              key={entity.id}
              onClick={() => handleSelect(entity)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue/10 transition-colors text-left border-b border-white/5 last:border-0"
            >
              <span className="text-xs text-blue-bright bg-blue/10 px-2 py-0.5 rounded font-mono uppercase tracking-wide">
                {entity.type}
              </span>
              <span className="text-white text-sm font-medium">{entity.canonicalName}</span>
              {entity.shortDescription && (
                <span className="text-gray-500 text-xs truncate flex-1">{entity.shortDescription}</span>
              )}
            </button>
          ))}
        </div>
      )}
      {open && results.length === 0 && !loading && query.length >= 2 && (
        <div className="absolute top-full mt-2 w-full bg-navy-light border border-blue/30 rounded-xl shadow-2xl z-40 px-4 py-3 text-gray-500 text-sm">
          Keine Ergebnisse für „{query}"
        </div>
      )}
    </div>
  );
}

// ─── Topic Card ───────────────────────────────────────────────────────────────
function TopicCard({ topic }: { topic: Topic }) {
  return (
    <a
      href={`/thema/${topic.slug}`}
      className="group flex flex-col gap-3 p-5 bg-navy-light border border-white/5 rounded-xl hover:border-blue/40 hover:bg-blue/5 transition-all duration-200 cursor-pointer"
    >
      <div className="flex items-center justify-between">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
          style={{ backgroundColor: topic.color ? `${topic.color}20` : "rgba(37,99,235,0.15)", border: `1px solid ${topic.color ?? "#2563eb"}40` }}
        >
          <span style={{ color: topic.color ?? "#3b82f6" }}>
            {getTopicIcon(topic.slug)}
          </span>
        </div>
        <ChevronRight size={16} className="text-gray-600 group-hover:text-blue-bright transition-colors" />
      </div>
      <div>
        <h3 className="text-white font-semibold text-sm">{topic.name}</h3>
        {topic.description && (
          <p className="text-gray-500 text-xs mt-1 line-clamp-2 leading-relaxed">{topic.description}</p>
        )}
      </div>
    </a>
  );
}

// ─── Entity Card ──────────────────────────────────────────────────────────────
function EntityCard({ entity }: { entity: Entity }) {
  const slug = entity.slug ?? entity.id;
  return (
    <a
      href={`/wissen/${slug}`}
      className="group flex flex-col gap-2 p-4 bg-navy-light border border-white/5 rounded-xl hover:border-blue/40 hover:bg-blue/5 transition-all duration-200"
    >
      <div className="flex items-center gap-2">
        <span className="text-xs text-blue-bright bg-blue/10 px-2 py-0.5 rounded font-mono uppercase tracking-wide">
          {entity.type}
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

// ─── Main Home Page ───────────────────────────────────────────────────────────
export default function Home() {
  const [ageConfirmed, setAgeConfirmed] = useState(() => {
    return localStorage.getItem("369_age_confirmed") === "true";
  });
  const [topics, setTopics] = useState<Topic[]>([]);
  const [featured, setFeatured] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);

  const handleAgeConfirm = () => {
    localStorage.setItem("369_age_confirmed", "true");
    setAgeConfirmed(true);
  };

  useEffect(() => {
    async function load() {
      try {
        const [topicsRes, entitiesRes] = await Promise.allSettled([
          api.topics.list(),
          api.entities.list({ limit: "8" }),
        ]);
        if (topicsRes.status === "fulfilled") setTopics(topicsRes.value.data);
        if (entitiesRes.status === "fulfilled") setFeatured(entitiesRes.value.data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <>
      {!ageConfirmed && <AgeGate onConfirm={handleAgeConfirm} />}

      <div className="min-h-screen bg-navy text-white">
        {/* ── Nav ── */}
        <nav className="sticky top-0 z-30 border-b border-white/5 bg-navy/90 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-gradient-to-br from-blue-mid to-blue-bright flex items-center justify-center">
                <span className="text-white font-bold text-xs">369</span>
              </div>
              <span className="text-white font-semibold text-sm">Research</span>
              <span className="text-gray-500 text-xs hidden sm:block">| Wissensportal</span>
            </a>
            <div className="flex items-center gap-4">
              <a href="/glossar" className="text-gray-400 hover:text-white text-xs transition-colors hidden sm:block">Glossar</a>
              <a href="/faq" className="text-gray-400 hover:text-white text-xs transition-colors hidden sm:block">FAQ</a>
              <a href="/admin" className="text-gray-600 hover:text-gray-400 text-xs transition-colors">Admin</a>
            </div>
          </div>
        </nav>

        {/* ── Hero ── */}
        <section className="relative overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-blue/5 via-transparent to-transparent pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative max-w-6xl mx-auto px-4 pt-20 pb-16 text-center">
            <div className="inline-flex items-center gap-2 bg-blue/10 border border-blue/20 rounded-full px-4 py-1.5 mb-6">
              <FlaskConical size={12} className="text-gold" />
              <span className="text-xs text-gray-400 font-medium">Research Use Only — Wissenschaftliche Wissensbasis</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4 leading-tight">
              Precision.{" "}
              <span className="bg-gradient-to-r from-blue-bright to-blue-mid bg-clip-text text-transparent">
                Purity.
              </span>{" "}
              Performance.
            </h1>

            <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
              Die evidenzbasierte Wissensbasis für Research Compounds, Peptide und biologische Optimierung.
              Mechanismen verstehen. Systeme denken.
            </p>

            <SearchBar />

            <div className="flex flex-wrap items-center justify-center gap-3 mt-6 text-xs text-gray-600">
              {["BPC-157", "TB-500", "SS-31", "GHK-Cu", "Retatrutide", "MOTS-c"].map((term) => (
                <a
                  key={term}
                  href={`/wissen/${term.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
                  className="hover:text-blue-bright transition-colors"
                >
                  {term}
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* ── Topics ── */}
        <section className="max-w-6xl mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-white">Themengebiete</h2>
              <p className="text-gray-500 text-xs mt-0.5">Strukturiertes Wissen nach Forschungsbereich</p>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-28 bg-navy-light rounded-xl animate-pulse" />
              ))}
            </div>
          ) : topics.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {topics.map((topic) => (
                <TopicCard key={topic.id} topic={topic} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-600">
              <BookOpen size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Themengebiete werden gerade aufgebaut.</p>
              <p className="text-xs mt-1 opacity-60">Inhalte folgen in Kürze.</p>
            </div>
          )}
        </section>

        {/* ── Featured Entities ── */}
        {featured.length > 0 && (
          <section className="max-w-6xl mx-auto px-4 py-8 border-t border-white/5">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-white">Compounds & Substanzen</h2>
                <p className="text-gray-500 text-xs mt-0.5">Kürzlich veröffentlichte Einträge</p>
              </div>
              <a href="/portal" className="flex items-center gap-1 text-xs text-blue-bright hover:text-white transition-colors">
                Alle anzeigen <ArrowRight size={12} />
              </a>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {featured.map((entity) => (
                <EntityCard key={entity.id} entity={entity} />
              ))}
            </div>
          </section>
        )}

        {/* ── Info Banner ── */}
        <section className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                icon: <Microscope size={20} />,
                title: "Evidenzbasiert",
                text: "Alle Inhalte basieren auf peer-reviewed Studien und wissenschaftlichen Quellen.",
              },
              {
                icon: <Dna size={20} />,
                title: "Mechanismus-First",
                text: "Wir erklären wie Substanzen wirken — nicht nur was sie tun.",
              },
              {
                icon: <FlaskConical size={20} />,
                title: "Research Use Only",
                text: "Diese Plattform dient ausschließlich wissenschaftlichen Forschungszwecken.",
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-4 p-5 bg-navy-light border border-white/5 rounded-xl">
                <div className="text-blue-bright flex-shrink-0 mt-0.5">{item.icon}</div>
                <div>
                  <h3 className="text-white font-semibold text-sm mb-1">{item.title}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="border-t border-white/5 mt-8">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-mid to-blue-bright flex items-center justify-center">
                    <span className="text-white font-bold text-xs">369</span>
                  </div>
                  <span className="text-white font-semibold text-sm">Research</span>
                </div>
                <p className="text-gray-600 text-xs">
                  Research Use Only. Not for human use. Alle Inhalte dienen ausschließlich Forschungszwecken.
                </p>
              </div>
              <div className="flex gap-4 text-xs text-gray-600">
                <a href="/impressum" className="hover:text-gray-400 transition-colors">Impressum</a>
                <a href="/datenschutz" className="hover:text-gray-400 transition-colors">Datenschutz</a>
                <a href="/admin" className="hover:text-gray-400 transition-colors">Admin</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
