import { useState, useEffect } from "react";
import { api, Protocol } from "@/lib/api";
import Navigation from "@/components/Navigation";

const GOAL_LABELS: Record<string, string> = {
  longevity: "Longevity",
  fat_loss: "Fettverlust",
  muscle: "Muskelaufbau",
  regeneration: "Regeneration",
  cognition: "Kognition",
  skin: "Haut",
  hormones: "Hormone",
  immune: "Immunsystem",
};

export default function Protokolle() {
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterGoal, setFilterGoal] = useState("");

  useEffect(() => {
    setLoading(true);
    api.protocols.list({ q: search || undefined, goal: filterGoal || undefined })
      .then((r) => { setProtocols(r.data); setTotal(r.total); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, filterGoal]);

  return (
    <div className="min-h-screen bg-navy text-white">
      <Navigation />
      <div className="pt-24 pb-16 max-w-5xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
            <a href="/" className="hover:text-gold transition-colors">Startseite</a>
            <span>/</span>
            <span className="text-gray-300">Protokolle</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">Protokolle</h1>
          <p className="text-gray-400 text-lg max-w-2xl">
            Wissenschaftlich fundierte Anwendungsprotokolle für Peptide, Compounds und Supplements — strukturiert nach Ziel, Dauer und Phasen.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-48">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Protokoll suchen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-navy-light border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-bright/50"
            />
          </div>
          <select
            value={filterGoal}
            onChange={(e) => setFilterGoal(e.target.value)}
            className="bg-navy-light border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-blue-bright/50"
          >
            <option value="">Alle Ziele</option>
            {Object.entries(GOAL_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <p className="text-sm text-gray-500 mb-4">{total} Protokolle</p>

        {/* Content */}
        {loading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-48 bg-navy-light rounded-xl animate-pulse" />
            ))}
          </div>
        ) : protocols.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <div className="text-4xl mb-4">📋</div>
            <p className="text-lg">Noch keine Protokolle verfügbar</p>
            <p className="text-sm mt-2">Protokolle werden laufend hinzugefügt.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {protocols.map((protocol) => (
              <a
                key={protocol.id}
                href={`/protokolle/${protocol.slug}`}
                className="block bg-navy-light border border-white/5 rounded-xl p-5 hover:border-blue-bright/30 hover:bg-white/5 transition-all group"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="font-semibold text-white group-hover:text-blue-bright transition-colors">
                    {protocol.name}
                  </h3>
                  <svg className="w-4 h-4 text-gray-600 group-hover:text-blue-bright transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {protocol.goal && (
                    <span className="text-xs px-2 py-0.5 bg-gold/10 text-gold rounded-full">
                      {GOAL_LABELS[protocol.goal] ?? protocol.goal}
                    </span>
                  )}
                  {protocol.duration && (
                    <span className="text-xs px-2 py-0.5 bg-white/5 text-gray-400 rounded-full">
                      {protocol.duration}
                    </span>
                  )}
                  {protocol.frequency && (
                    <span className="text-xs px-2 py-0.5 bg-white/5 text-gray-400 rounded-full">
                      {protocol.frequency}
                    </span>
                  )}
                </div>
                {protocol.compounds && protocol.compounds.length > 0 && (
                  <p className="text-xs text-gray-500">
                    Compounds: {protocol.compounds.slice(0, 3).join(", ")}{protocol.compounds.length > 3 ? ` +${protocol.compounds.length - 3}` : ""}
                  </p>
                )}
              </a>
            ))}
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-16 border-t border-white/10 pt-8 text-xs text-gray-600 text-center">
          Alle Protokolle dienen ausschließlich wissenschaftlichen und Forschungszwecken. Research Use Only — Not for human use.
        </div>
      </div>
    </div>
  );
}
