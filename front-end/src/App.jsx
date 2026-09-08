import { useCallback, useEffect, useState } from "react";
import { AuthProvider } from "@/auth/AuthProvider";
import { ProtectedRoute } from "@/auth/ProtectedRoute";
import { AuthCallback } from "@/pages/AuthCallback";
import { DashboardRouter } from "@/pages/DashboardRouter";
import { Login } from "./login/Login";

function App() {
  const [path, setPath] = useState(window.location.pathname);

  const navigate = useCallback((nextPath) => {
    window.history.pushState({}, "", nextPath);
    setPath(window.location.pathname);
  }, []);

  useEffect(() => {
    function handleNavigation() {
      setPath(window.location.pathname);
    }

    window.addEventListener("popstate", handleNavigation);
    return () => window.removeEventListener("popstate", handleNavigation);
  }, []);

  return (
    <AuthProvider>
      {path === "/auth/callback" ? <AuthCallback navigate={navigate} /> : null}
      {path === "/login" ? <Login /> : null}
      {path !== "/auth/callback" && path !== "/login" ? (
        <ProtectedRoute>
          <DashboardRouter />
        </ProtectedRoute>
      ) : null}
    </AuthProvider>
  );
}

export default App;
