import { AuthProvider } from "@/lib/auth";
import Portal from "@/pages/Portal";
import EntityDetail from "@/pages/EntityDetail";
import Admin from "@/pages/Admin";
import "@/styles/globals.css";

export default function App() {
  const path = window.location.pathname;

  // Simple client-side routing
  if (path.startsWith("/admin")) {
    return (
      <AuthProvider>
        <Admin />
      </AuthProvider>
    );
  }

  if (path.startsWith("/wissen/")) {
    const entityId = path.replace("/wissen/", "").replace(/\/$/, "");
    return <EntityDetail entityId={entityId} />;
  }

  return <Portal />;
}
