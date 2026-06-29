import { AuthProvider } from "@/lib/auth";
import Home from "@/pages/Home";
import Portal from "@/pages/Portal";
import EntityDetail from "@/pages/EntityDetail";
import TopicPage from "@/pages/TopicPage";
import Admin from "@/pages/Admin";
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

  // Entity detail: /wissen/:slug
  if (path.startsWith("/wissen/")) {
    const entityId = path.replace("/wissen/", "").replace(/\/$/, "");
    return <EntityDetail entityId={entityId} />;
  }

  // Portal (alle Entities)
  if (path === "/portal") {
    return <Portal />;
  }

  // Home
  return <Home />;
}
