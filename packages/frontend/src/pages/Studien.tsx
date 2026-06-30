import { useState, useEffect } from "react";
import { api, Study } from "@/lib/api";
import Navigation from "@/components/Navigation";

const STUDY_TYPES: Record<string, string> = {
  rct: "RCT",
  meta_analysis: "Meta-Analyse",
  systematic_review: "Systematic Review",
  cohort: "Kohortenstudie",
  case_control: "Fall-Kontroll",
  case_report: "Fallbericht",
  in_vitro: "In Vitro",
  animal: "Tiermodell",
  review: "Review",
  other: "Sonstige",
};

const EVIDENCE_COLORS: Record<string, string> = {
  "1a": "text-emerald-400 bg-emerald-400/10",
  "1b": "text-emerald-400 bg-emerald-400/10",
  "2a": "text-blue-400 bg-blue-400/10",
  "2b": "text-blue-400 bg-blue-400/10",
  "3": "text-yellow-400 bg-yellow-400/10",
  "4": "text-orange-400 bg-orange-400/10",
  "5": "text-gray-400 bg-gray-400/10",
};

export default function Studien() {
  const [studies, setStudies] = useState<Study[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterHuman, setFilterHuman] = useState(false);
  const [filterRct, setFilterRct] = useState(false);
  const LIMIT = 20;

  useEffect(() => {
    setLoading(true);
    api.studies.list({
      page: String(page),
      limit: String(LIMIT),
      q: search || undefined,
      studyType: filterType || undefined,
      isHuman: filterHuman ? "true" : undefined,
      isRct: filterRct ? "true" : undefined,
    })
      .then((r) => { setStudies(r.data); setTotal(r.total); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, search, filterType, filterHuman, filterRct]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="min-h-screen bg-navy text-white">
      <Navigation />
      <div className="pt-24 pb-16 max-w-5xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
            <a href="/" className="hover:text-gold transition-colors">Startseite</a>
            <span>/</span>
            <span className="text-gray-300">Studien</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">Studiendatenbank</h1>
          <p className="text-gray-400 text-lg max-w-2xl">
            Kuratierte wissenschaftliche Studien zu Longevity, Peptiden, Metabolismus und Performance — mit KI-generierten deutschen Zusammenfassungen.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-navy-light border border-white/10 rounded-xl p-4 mb-6 space-y-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Studien suchen..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-bright/50"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-bright/50"
            >
              <option value="">Alle Studientypen</option>
              {Object.entries(STUDY_TYPES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <label className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 cursor-pointer hover:bg-white/10 transition-colors">
              <input
                type="checkbox"
                checked={filterHuman}
                onChange={(e) => { setFilterHuman(e.target.checked); setPage(1); }}
                className="rounded"
              />
              Humanstudie
            </label>
            <label className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 cursor-pointer hover:bg-white/10 transition-colors">
              <input
                type="checkbox"
                checked={filterRct}
                onChange={(e) => { setFilterRct(e.target.checked); setPage(1); }}
                className="rounded"
              />
              RCT only
            </label>
          </div>
        </div>

        {/* Results count */}
        <p className="text-sm text-gray-500 mb-4">{total} Studien gefunden</p>

        {/* Studies List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-28 bg-navy-light rounded-xl animate-pulse" />
            ))}
          </div>
        ) : studies.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg">Keine Studien gefunden</p>
            <p className="text-sm mt-2">Die Studiendatenbank wird kontinuierlich erweitert.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {studies.map((study) => (
              <div
                key={study.id}
                className="bg-navy-light border border-white/5 rounded-xl p-5 hover:border-blue-bright/20 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {study.studyType && (
                        <span className="text-xs px-2 py-0.5 bg-blue-bright/10 text-blue-bright rounded-full">
                          {STUDY_TYPES[study.studyType] ?? study.studyType}
                        </span>
                      )}
                      {study.isHuman && (
                        <span className="text-xs px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full">
                          Humanstudie
                        </span>
                      )}
                      {study.isRct && (
                        <span className="text-xs px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded-full">
                          RCT
                        </span>
                      )}
                      {study.evidenceLevel && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${EVIDENCE_COLORS[study.evidenceLevel] ?? "text-gray-400 bg-gray-400/10"}`}>
                          Evidenz {study.evidenceLevel}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-white text-sm leading-snug mb-1">
                      {study.title}
                    </h3>
                    {study.authors && study.authors.length > 0 && (
                      <p className="text-xs text-gray-500 mb-1">
                        {study.authors.slice(0, 3).join(", ")}{study.authors.length > 3 ? " et al." : ""}
                        {study.journal && ` · ${study.journal}`}
                        {study.year && ` · ${study.year}`}
                      </p>
                    )}
                    {study.aiSummaryDe && (
                      <p className="text-sm text-gray-400 line-clamp-2 mt-2">{study.aiSummaryDe}</p>
                    )}
                  </div>
                  {study.doi && (
                    <a
                      href={`https://doi.org/${study.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 text-xs text-blue-bright hover:underline"
                    >
                      DOI ↗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ← Zurück
            </button>
            <span className="text-sm text-gray-500">Seite {page} von {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Weiter →
            </button>
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-16 border-t border-white/10 pt-8 text-xs text-gray-600 text-center">
          Alle Studien dienen ausschließlich wissenschaftlichen und Forschungszwecken. Research Use Only — Not for human use.
        </div>
      </div>
    </div>
  );
}
