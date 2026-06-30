import { AuthProvider } from "@/lib/auth";
import Home from "@/pages/Home";
import Portal from "@/pages/Portal";
import EntityDetail from "@/pages/EntityDetail";
import TopicPage from "@/pages/TopicPage";
import Admin from "@/pages/Admin";
import Glossar from "@/pages/Glossar";
import Studien from "@/pages/Studien";
import Protokolle from "@/pages/Protokolle";
import Suche from "@/pages/Suche";
import "@/styles/globals.css";

export default function App() {
  const path = window.location.pathname;

  // Admin
  if (path.startsWith("/admin")) {
    return (
      <AuthProvider>
        <Admin />
      </AuthProvider>
    );
  }

  // Topic page: /thema/:slug
  if (path.startsWith("/thema/")) {
    const topicSlug = path.replace("/thema/", "").replace(/\/$/, "");
    return <TopicPage topicSlug={topicSlug} />;
  }

  // Entity detail: /wissen/:slug or /wissen/:id
  if (path.startsWith("/wissen/")) {
    const entitySlug = path.replace("/wissen/", "").replace(/\/$/, "");
    return <EntityDetail entityId={entitySlug} />;
  }

  // Compound type pages: /compounds, /peptide, /mechanismen, /supplements, /kosmetik
  if (path.startsWith("/wissen") && path !== "/wissen") {
    return <Portal />;
  }

  // Glossar
  if (path === "/glossar" || path.startsWith("/glossar")) {
    return <Glossar />;
  }

  // Studien
  if (path === "/studien" || path.startsWith("/studien")) {
    return <Studien />;
  }

  // Protokolle
  if (path === "/protokolle" || path.startsWith("/protokolle")) {
    return <Protokolle />;
  }

  // Suche
  if (path === "/suche") {
    return <Suche />;
  }

  // Portal (alle Entities)
  if (path === "/portal") {
    return <Portal />;
  }

  // Home
  return <Home />;
}
