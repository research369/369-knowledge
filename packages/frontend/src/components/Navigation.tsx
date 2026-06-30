import { useState, useEffect, useRef } from "react";

const TOPICS = [
  { slug: "longevity", name: "Longevity", icon: "⏳" },
  { slug: "mitochondrien", name: "Mitochondrien", icon: "⚡" },
  { slug: "fettverlust", name: "Fettverlust", icon: "🔥" },
  { slug: "muskelaufbau", name: "Muskelaufbau", icon: "💪" },
  { slug: "regeneration", name: "Regeneration", icon: "🔄" },
  { slug: "hormone", name: "Hormone", icon: "🧬" },
  { slug: "haut", name: "Haut & Kosmetik", icon: "✨" },
  { slug: "kognition", name: "Kognition", icon: "🧠" },
  { slug: "immunsystem", name: "Immunsystem", icon: "🛡️" },
  { slug: "biomarker", name: "Biomarker", icon: "📊" },
];

const ENTITY_TYPES = [
  { slug: "peptide", name: "Peptide", path: "/wissen?type=peptide" },
  { slug: "compound", name: "Compounds", path: "/wissen?type=compound" },
  { slug: "mechanismus", name: "Mechanismen", path: "/wissen?type=mechanismus" },
  { slug: "supplement", name: "Supplements", path: "/wissen?type=supplement" },
  { slug: "kosmetik", name: "Kosmetik", path: "/wissen?type=kosmetik" },
];

export default function Navigation() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    const handleClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setMegaOpen(null);
      }
    };
    window.addEventListener("scroll", handleScroll);
    document.addEventListener("click", handleClick);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("click", handleClick);
    };
  }, []);

  const navigate = (path: string) => {
    window.location.href = path;
    setMobileOpen(false);
    setMegaOpen(null);
  };

  return (
    <nav
      ref={navRef}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-navy/95 backdrop-blur-md shadow-lg shadow-black/20" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 group"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-bright to-gold flex items-center justify-center text-navy font-bold text-sm">
              369
            </div>
            <span className="text-white font-semibold text-sm tracking-wide hidden sm:block">
              Research <span className="text-gold">Wissen</span>
            </span>
          </button>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {/* Themen Dropdown */}
            <div className="relative">
              <button
                onClick={() => setMegaOpen(megaOpen === "themen" ? null : "themen")}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  megaOpen === "themen"
                    ? "bg-white/10 text-white"
                    : "text-gray-300 hover:text-white hover:bg-white/5"
                }`}
              >
                Themen ▾
              </button>
              {megaOpen === "themen" && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-navy-light border border-white/10 rounded-xl shadow-2xl p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 px-1">Themengebiete</p>
                  <div className="grid grid-cols-2 gap-1">
                    {TOPICS.map((t) => (
                      <button
                        key={t.slug}
                        onClick={() => navigate(`/thema/${t.slug}`)}
                        className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors text-left"
                      >
                        <span>{t.icon}</span>
                        <span>{t.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Compounds Dropdown */}
            <div className="relative">
              <button
                onClick={() => setMegaOpen(megaOpen === "compounds" ? null : "compounds")}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  megaOpen === "compounds"
                    ? "bg-white/10 text-white"
                    : "text-gray-300 hover:text-white hover:bg-white/5"
                }`}
              >
                Compounds ▾
              </button>
              {megaOpen === "compounds" && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-navy-light border border-white/10 rounded-xl shadow-2xl p-3">
                  {ENTITY_TYPES.map((t) => (
                    <button
                      key={t.slug}
                      onClick={() => navigate(t.path)}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => navigate("/studien")}
              className="px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              Studien
            </button>
            <button
              onClick={() => navigate("/glossar")}
              className="px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              Glossar
            </button>
            <button
              onClick={() => navigate("/protokolle")}
              className="px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              Protokolle
            </button>
          </div>

          {/* Search + Mobile Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/suche")}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Suche"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Menü"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                }
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-navy-light border-t border-white/10">
          <div className="px-4 py-4 space-y-1">
            <p className="text-xs text-gray-500 uppercase tracking-wider px-2 mb-2">Themen</p>
            {TOPICS.map((t) => (
              <button
                key={t.slug}
                onClick={() => navigate(`/thema/${t.slug}`)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors text-left"
              >
                <span>{t.icon}</span>
                <span>{t.name}</span>
              </button>
            ))}
            <div className="border-t border-white/10 my-3" />
            <button onClick={() => navigate("/studien")} className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors">Studien</button>
            <button onClick={() => navigate("/glossar")} className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors">Glossar</button>
            <button onClick={() => navigate("/protokolle")} className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors">Protokolle</button>
            <button onClick={() => navigate("/suche")} className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors">Suche</button>
          </div>
        </div>
      )}
    </nav>
  );
}
