import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import { api, Entity, ContentBlock, Relation } from "@/lib/api";
import { ArrowLeft, ExternalLink, FlaskConical, BookOpen, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import ReactMarkdown from "react-markdown";

const LAYER_LABELS: Record<string, string> = {
  L1: "Überblick",
  L2: "Mechanismus",
  L3: "Anwendung",
  L4: "Studien",
  L5: "Sicherheit",
  L6: "Kombinationen",
  L7: "Rohdaten",
};

const BLOCK_TYPE_LABELS: Record<string, string> = {
  summary: "Zusammenfassung",
  mechanism: "Wirkmechanismus",
  pharmacology: "Pharmakologie",
  research_overview: "Forschungsübersicht",
  protocol: "Protokoll",
  dosing: "Dosierung",
  safety: "Sicherheit",
  side_effects: "Nebenwirkungen",
  interactions: "Wechselwirkungen",
  clinical_studies: "Klinische Studien",
  animal_studies: "Tierstudien",
  combinations: "Kombinationen",
  stack: "Stack",
  faq: "FAQ",
  glossary: "Glossar",
  what_is: "Was ist",
  simple_explanation: "Einfach erklärt",
  research_result: "Forschungsergebnis",
  references: "Quellen",
  materials: "Was du brauchst",
  steps: "Schritt-für-Schritt",
  common_errors: "Häufige Fehler",
};

const RELATION_LABELS: Record<string, string> = {
  activates: "aktiviert",
  inhibits: "hemmt",
  interacts_with: "interagiert mit",
  synergizes_with: "synergiert mit",
  antagonizes: "antagonisiert",
  part_of: "Teil von",
  related_to: "verwandt mit",
  recommends: "empfiehlt",
  contradicts: "widerspricht",
  upregulates: "hochreguliert",
  downregulates: "herunterreguliert",
};

const TYPE_LABELS: Record<string, string> = {
  compound: "Compound",
  peptide: "Peptid",
  supplement: "Supplement",
  kosmetik: "Kosmetik",
  mechanismus: "Mechanismus",
  signalweg: "Signalweg",
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
  // legacy keys
  mechanism: "Mechanismus",
  receptor: "Rezeptor",
  gene: "Gen",
  disease: "Erkrankung",
  glossary: "Glossar",
  academy_module: "Academy",
};

function formatBody(body: string): string {
  return body
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br/>")
    .replace(/^/, "<p>")
    .replace(/$/, "</p>");
}

function BlockCard({ block }: { block: ContentBlock }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="border border-white/5 rounded-xl overflow-hidden bg-navy-light">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xs text-blue-bright bg-blue/10 px-2 py-0.5 rounded font-mono">
            {block.layer}
          </span>
          <span className="text-white font-semibold text-sm">
            {block.title ?? BLOCK_TYPE_LABELS[block.blockType] ?? block.blockType}
          </span>
        </div>
        {expanded ? (
          <ChevronUp size={14} className="text-gray-500" />
        ) : (
          <ChevronDown size={14} className="text-gray-500" />
        )}
      </button>

      {expanded && (
        <div className="px-5 pb-5">
          <div
            className="text-gray-300 text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: formatBody(block.body) }}
          />
          {block.sources?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/5">
              <p className="text-xs text-gray-600 font-medium mb-2">Quellen</p>
              <ul className="space-y-1">
                {block.sources.map((src, i) => (
                  <li key={i} className="text-xs text-gray-600">
                    {src.startsWith("http") ? (
                      <a
                        href={src}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-bright hover:underline flex items-center gap-1"
                      >
                        {src.length > 60 ? src.slice(0, 60) + "…" : src}
                        <ExternalLink size={10} />
                      </a>
                    ) : (
                      <span>[{i + 1}] {src}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RelationCard({ relation, entityNames }: { relation: Relation; entityNames: Record<string, string> }) {
  const targetName = relation.toEntityName ?? entityNames[relation.toEntityId] ?? relation.toEntityId;
  const targetSlug = relation.toEntitySlug ?? relation.toEntityId;
  return (
    <a
      href={`/wissen/${targetSlug}`}
      className="flex items-center gap-3 p-3 bg-navy-light border border-white/5 rounded-lg hover:border-blue/30 hover:bg-blue/5 transition-all text-sm"
    >
      <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded whitespace-nowrap">
        {RELATION_LABELS[relation.relationType] ?? relation.relationType}
      </span>
      <span className="text-white font-medium truncate">{targetName}</span>
      {relation.evidenceLevel && (
        <span className="text-xs text-gray-600 ml-auto whitespace-nowrap">{relation.evidenceLevel}</span>
      )}
    </a>
  );
}

export default function EntityDetail({ entityId }: { entityId: string }) {
  const [entity, setEntity] = useState<Entity | null>(null);
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [showAllRelations, setShowAllRelations] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState<string>("all");

  useEffect(() => {
    async function load() {
      try {
        // Try slug first
        let res;
        try {
          res = await api.entities.getBySlug(entityId);
        } catch {
          res = await api.entities.get(entityId);
        }
        setEntity(res.entity);
        setBlocks(res.blocks ?? []);
        // Sort by importance: synergizes_with > activates/inhibits > improves > rest
        // Also filter out FAQ/Protocol/Guide/Stack entity types
        const RELATION_PRIORITY: Record<string, number> = {
          synergizes_with: 0,
          activates: 1,
          inhibits: 1,
          upregulates: 2,
          downregulates: 2,
          improves: 3,
          worsens: 3,
          reduces: 3,
          increases: 3,
          interacts_with: 4,
          combined_with: 4,
          potentiates: 4,
          binds_to: 5,
          antagonizes: 5,
          treats: 6,
          relevant_for: 7,
          studied_in: 8,
          evidenced_by: 9,
        };
        const EXCLUDED_ENTITY_TYPES = new Set(["faq", "protocol", "guide", "stack", "glossary_term", "glossar"]);
        const rawRelations: Relation[] = res.relations ?? [];
        const sortedRelations = rawRelations
          .filter((r: Relation) => {
            // Use enriched toEntityType first, fall back to legacy toEntity?.type
            const toType = r.toEntityType ?? (r as any).toEntity?.type;
            if (toType && EXCLUDED_ENTITY_TYPES.has(toType)) return false;
            return true;
          })
          .sort((a: Relation, b: Relation) => {
            const pa = RELATION_PRIORITY[a.relationType] ?? 10;
            const pb = RELATION_PRIORITY[b.relationType] ?? 10;
            return pa - pb;
          });
        setRelations(sortedRelations);
      } catch (err: any) {
        setError(err.message ?? "Eintrag nicht gefunden");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [entityId]);

  useEffect(() => {
    if (entity) {
      document.title = `${entity.seoTitle ?? entity.canonicalName} — 369 Research`;
    }
  }, [entity]);

  const layers = Array.from(new Set(blocks.map((b) => b.layer))).sort();
  const filteredBlocks = activeLayer === "all" ? blocks : blocks.filter((b) => b.layer === activeLayer);

  if (loading) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-bright border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !entity) {
    return (
      <div className="min-h-screen bg-navy flex flex-col items-center justify-center text-center px-4">
        <BookOpen size={48} className="text-gray-700 mb-4" />
        <h1 className="text-white text-xl font-bold mb-2">Eintrag nicht gefunden</h1>
        <p className="text-gray-500 text-sm mb-6">{error}</p>
        <a href="/" className="bg-blue text-white px-6 py-2 rounded-lg text-sm hover:bg-blue-mid transition-colors">
          Zur Startseite
        </a>
      </div>
    );
  }

  // Schema.org JSON-LD
  const schemaOrg = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: entity.seoTitle ?? entity.canonicalName,
    description: entity.seoDescription ?? entity.shortDescription,
    keywords: entity.seoKeywords?.join(", "),
    publisher: {
      "@type": "Organization",
      name: "369 Research",
      url: "https://369research.eu",
    },
    dateModified: entity.updatedAt,
    datePublished: entity.publishedAt ?? entity.createdAt,
  };

  return (
    <div className="min-h-screen bg-navy text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }}
      />

      <Navigation />

      <div className="max-w-6xl mx-auto px-4 pt-24 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── Main Content ── */}
          <div className="lg:col-span-2">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-xs text-blue-bright bg-blue/10 px-2 py-0.5 rounded font-mono uppercase tracking-wide">
                  {TYPE_LABELS[entity.type] ?? entity.type}
                </span>
                {entity.casNumber && (
                  <span className="text-xs text-gray-600 bg-white/5 px-2 py-0.5 rounded font-mono">
                    CAS: {entity.casNumber}
                  </span>
                )}
              </div>

              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                {entity.canonicalName}
              </h1>

              {entity.aliases?.length > 0 && (
                <p className="text-gray-500 text-sm mb-3">
                  Auch bekannt als: {entity.aliases.join(", ")}
                </p>
              )}

              {(entity.shortDescription || entity.seoDescription) && (
                <p className="text-gray-300 text-base leading-relaxed">
                  {entity.shortDescription ?? entity.seoDescription}
                </p>
              )}
            </div>

            {/* Research Use Only Banner */}
            <div className="flex items-start gap-3 p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl mb-6">
              <AlertTriangle size={16} className="text-yellow-500/70 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-500/70 leading-relaxed">
                <span className="font-semibold">Research Use Only.</span> Alle Inhalte auf dieser Seite dienen
                ausschließlich wissenschaftlichen und Forschungszwecken. Keine der dargestellten Informationen
                stellt medizinischen Rat dar und ist nicht für die menschliche Anwendung bestimmt.
              </p>
            </div>

            {/* Layer Filter */}
            {layers.length > 1 && (
              <div className="flex gap-2 flex-wrap mb-6">
                <button
                  onClick={() => setActiveLayer("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeLayer === "all"
                      ? "bg-blue text-white"
                      : "bg-navy-light text-gray-400 hover:text-white border border-white/10"
                  }`}
                >
                  Alle
                </button>
                {layers.map((layer) => (
                  <button
                    key={layer}
                    onClick={() => setActiveLayer(layer)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      activeLayer === layer
                        ? "bg-blue text-white"
                        : "bg-navy-light text-gray-400 hover:text-white border border-white/10"
                    }`}
                  >
                    {LAYER_LABELS[layer] ?? layer}
                  </button>
                ))}
              </div>
            )}

            {/* Content Blocks */}
            {filteredBlocks.length > 0 ? (
              <div className="space-y-3">
                {filteredBlocks.map((block) => (
                  <BlockCard key={block.id} block={block} />
                ))}
              </div>
            ) : entity?.fullContent ? (
              <div className="bg-navy-light border border-white/5 rounded-xl p-6">
                <div className="
                  [&_h2]:text-white [&_h2]:font-semibold [&_h2]:text-base [&_h2]:mt-6 [&_h2]:mb-3
                  [&_h2]:border-b [&_h2]:border-white/10 [&_h2]:pb-2 [&_h2:first-child]:mt-0
                  [&_h3]:text-white [&_h3]:font-medium [&_h3]:text-sm [&_h3]:mt-4 [&_h3]:mb-2
                  [&_p]:text-gray-300 [&_p]:leading-relaxed [&_p]:text-sm [&_p]:mb-3
                  [&_ul]:my-2 [&_ul]:space-y-1 [&_ul]:pl-4
                  [&_li]:text-gray-300 [&_li]:text-sm [&_li]:list-disc [&_li]:marker:text-blue-bright
                  [&_strong]:text-white [&_strong]:font-semibold
                  [&_a]:text-blue-bright [&_a]:no-underline hover:[&_a]:underline
                ">
                  <ReactMarkdown>{entity.fullContent}</ReactMarkdown>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-gray-600 border border-white/5 rounded-xl">
                <FlaskConical size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Inhalte werden gerade aufgebaut.</p>
                <p className="text-xs mt-1 opacity-60">Dieser Eintrag wird in Kürze mit Inhalten befüllt.</p>
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-5">
            {/* Metrics */}
            {entity.metrics?.length > 0 && (
              <div className="bg-navy-light border border-white/5 rounded-xl p-5">
                <h3 className="text-white font-semibold text-sm mb-4">Kennzahlen</h3>
                <div className="space-y-3">
                  {entity.metrics.map((metric, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <span className="text-gray-500 text-xs">{metric.label}</span>
                      <span className="text-white text-xs font-medium">
                        {metric.value}
                        {metric.unit && <span className="text-gray-500 ml-1">{metric.unit}</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {entity.tags?.length > 0 && (
              <div className="bg-navy-light border border-white/5 rounded-xl p-5">
                <h3 className="text-white font-semibold text-sm mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {entity.tags.map((tag) => (
                    <span key={tag} className="text-xs text-gray-400 bg-white/5 px-2 py-1 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Categories */}
            {entity.categories?.length > 0 && (
              <div className="bg-navy-light border border-white/5 rounded-xl p-5">
                <h3 className="text-white font-semibold text-sm mb-3">Kategorien</h3>
                <div className="flex flex-wrap gap-2">
                  {entity.categories.map((cat) => (
                    <span key={cat} className="text-xs text-blue-bright bg-blue/10 px-2 py-1 rounded">
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Relations */}
            {relations?.length > 0 && (
              <div className="bg-navy-light border border-white/5 rounded-xl p-5">
                <h3 className="text-white font-semibold text-sm mb-3">Verwandte Einträge</h3>
                <div className="space-y-2">
                  {(showAllRelations ? relations : relations.slice(0, 12)).map((rel) => (
                    <RelationCard key={rel.id} relation={rel} entityNames={{}} />
                  ))}
                  {relations.length > 12 && (
                    <button
                      onClick={() => setShowAllRelations(!showAllRelations)}
                      className="text-xs text-blue-400 hover:text-blue-300 text-center pt-1 w-full transition-colors cursor-pointer"
                    >
                      {showAllRelations ? "Weniger anzeigen ↑" : `+ ${relations.length - 12} weitere anzeigen ↓`}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Meta */}
            <div className="bg-navy-light border border-white/5 rounded-xl p-5">
              <h3 className="text-white font-semibold text-sm mb-3">Metadaten</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Typ</span>
                  <span className="text-gray-400">{TYPE_LABELS[entity.type] ?? entity.type}</span>
                </div>
                {entity.language && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sprache</span>
                    <span className="text-gray-400">{entity.language.toUpperCase()}</span>
                  </div>
                )}
                {entity.publishedAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Veröffentlicht</span>
                    <span className="text-gray-400">
                      {new Date(entity.publishedAt).toLocaleDateString("de-DE")}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Version</span>
                  <span className="text-gray-400">v{entity.version}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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
