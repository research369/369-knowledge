import { useState, useEffect, useRef } from "react";
import { api, Entity } from "@/lib/api";
import Navigation from "@/components/Navigation";

const TYPE_LABELS: Record<string, string> = {
  compound: "Compound",
  peptide: "Peptid",
  mechanismus: "Mechanismus",
  signalweg: "Signalweg",
  supplement: "Supplement",
  kosmetik: "Kosmetik",
  studie: "Studie",
  erkrankung: "Erkrankung",
  symptom: "Symptom",
  biomarker: "Biomarker",
  gen: "Gen",
  protein: "Protein",
  rezeptor: "Rezeptor",
  organ: "Organ",
  glossar: "Glossar",
  guide: "Guide",
  stack: "Stack",
  faq: "FAQ",
};

const TYPE_COLORS: Record<string, string> = {
  compound: "bg-blue-bright/10 text-blue-bright",
  peptide: "bg-purple-500/10 text-purple-400",
  mechanismus: "bg-emerald-500/10 text-emerald-400",
  supplement: "bg-yellow-500/10 text-yellow-400",
  glossar: "bg-gray-500/10 text-gray-400",
  guide: "bg-gold/10 text-gold",
};

export default function Suche() {
  const [query, setQuery] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("q") ?? "";
  });
  const [results, setResults] = useState<Entity[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); setSearched(false); return; }
    const timer = setTimeout(() => {
      setLoading(true);
      setSearched(true);
      api.search.query(query, { limit: 30 })
        .then((r) => { setResults(r.data); setTotal(r.total); })
        .catch(console.error)
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const url = new URL(window.location.href);
    url.searchParams.set("q", query);
    window.history.replaceState({}, "", url.toString());
  };

  return (
    <div className="min-h-screen bg-navy text-white">
      <Navigation />
      <div className="pt-24 pb-16 max-w-3xl mx-auto px-4 sm:px-6">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-6">Suche</h1>
          <form onSubmit={handleSubmit} className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              placeholder="Compound, Mechanismus, Begriff suchen..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-navy-light border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-bright/50 text-lg transition-colors"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
              >
                ✕
              </button>
            )}
          </form>
        </div>

        {/* Results */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-navy-light rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <p className="text-lg mb-2">Keine Ergebnisse für „{query}"</p>
            <p className="text-sm">Versuche einen anderen Begriff oder schau im <a href="/glossar" className="text-blue-bright hover:underline">Glossar</a>.</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <>
            <p className="text-sm text-gray-500 mb-4">{total} Ergebnisse für „{query}"</p>
            <div className="space-y-2">
              {results.map((entity) => (
                <a
                  key={entity.id}
                  href={`/wissen/${entity.slug ?? entity.id}`}
                  className="flex items-start gap-4 p-4 bg-navy-light border border-white/5 rounded-xl hover:border-blue-bright/30 hover:bg-white/5 transition-all group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-white group-hover:text-blue-bright transition-colors">
                        {entity.canonicalName}
                      </h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLORS[entity.type] ?? "bg-white/5 text-gray-400"}`}>
                        {TYPE_LABELS[entity.type] ?? entity.type}
                      </span>
                    </div>
                    {entity.shortDescription && (
                      <p className="text-sm text-gray-400 line-clamp-2">{entity.shortDescription}</p>
                    )}
                  </div>
                  <svg className="w-4 h-4 text-gray-600 group-hover:text-blue-bright transition-colors flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              ))}
            </div>
          </>
        )}

        {!searched && !loading && (
          <div className="text-center py-16 text-gray-600">
            <p className="text-sm">Gib einen Suchbegriff ein um zu starten</p>
          </div>
        )}
      </div>
    </div>
  );
}
