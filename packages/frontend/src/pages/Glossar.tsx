import { useState, useEffect } from "react";
import { api, Entity } from "@/lib/api";
import Navigation from "@/components/Navigation";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export default function Glossar() {
  const [terms, setTerms] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.entities.list({ type: "glossary_term", status: "published", limit: "500" })
      .then((r) => setTerms(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = terms.filter((t) => {
    const name = t.canonicalName.toLowerCase();
    if (search) return name.includes(search.toLowerCase());
    if (activeLetter) return name.startsWith(activeLetter.toLowerCase());
    return true;
  });

  const grouped = filtered.reduce<Record<string, Entity[]>>((acc, t) => {
    const letter = t.canonicalName[0]?.toUpperCase() ?? "#";
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(t);
    return acc;
  }, {});

  const availableLetters = new Set(terms.map((t) => t.canonicalName[0]?.toUpperCase() ?? "#"));

  return (
    <div className="min-h-screen bg-navy text-white">
      <Navigation />
      <div className="pt-24 pb-16 max-w-5xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
            <a href="/" className="hover:text-gold transition-colors">Startseite</a>
            <span>/</span>
            <span className="text-gray-300">Glossar</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">Glossar</h1>
          <p className="text-gray-400 text-lg max-w-2xl">
            Wissenschaftliche Fachbegriffe, Mechanismen und Konzepte aus dem Bereich Longevity, Biohacking und Research Compounds — klar erklärt.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Begriff suchen..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setActiveLetter(null); }}
            className="w-full bg-navy-light border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-bright/50 transition-colors"
          />
        </div>

        {/* Alphabet Filter */}
        {!search && (
          <div className="flex flex-wrap gap-1 mb-8">
            <button
              onClick={() => setActiveLetter(null)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                !activeLetter ? "bg-blue-bright text-navy" : "text-gray-400 hover:text-white hover:bg-white/10"
              }`}
            >
              Alle
            </button>
            {ALPHABET.map((letter) => (
              <button
                key={letter}
                onClick={() => setActiveLetter(activeLetter === letter ? null : letter)}
                disabled={!availableLetters.has(letter)}
                className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                  activeLetter === letter
                    ? "bg-blue-bright text-navy"
                    : availableLetters.has(letter)
                    ? "text-gray-300 hover:text-white hover:bg-white/10"
                    : "text-gray-700 cursor-not-allowed"
                }`}
              >
                {letter}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-navy-light rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg">Keine Begriffe gefunden</p>
            {(search || activeLetter) && (
              <button
                onClick={() => { setSearch(""); setActiveLetter(null); }}
                className="mt-3 text-blue-bright hover:underline text-sm"
              >
                Filter zurücksetzen
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([letter, items]) => (
              <div key={letter} id={`letter-${letter}`}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl font-bold text-gold">{letter}</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>
                <div className="space-y-2">
                  {items.sort((a, b) => a.canonicalName.localeCompare(b.canonicalName)).map((term) => (
                    <a
                      key={term.id}
                      href={`/wissen/${term.slug ?? term.id}`}
                      className="block bg-navy-light border border-white/5 rounded-xl p-4 hover:border-blue-bright/30 hover:bg-white/5 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-white group-hover:text-blue-bright transition-colors">
                            {term.canonicalName}
                          </h3>
                          {term.aliases?.length > 0 && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              Auch: {term.aliases.slice(0, 3).join(", ")}
                            </p>
                          )}
                          {term.shortDescription && (
                            <p className="text-sm text-gray-400 mt-1 line-clamp-2">{term.shortDescription}</p>
                          )}
                        </div>
                        <svg className="w-4 h-4 text-gray-600 group-hover:text-blue-bright transition-colors flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-16 border-t border-white/10 pt-8 text-xs text-gray-600 text-center">
          Alle Inhalte dienen ausschließlich wissenschaftlichen und Forschungszwecken. Research Use Only — Not for human use.
        </div>
      </div>
    </div>
  );
}
