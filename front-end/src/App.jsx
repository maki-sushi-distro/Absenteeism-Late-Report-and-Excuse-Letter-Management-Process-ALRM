import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthProvider } from "@/auth/AuthProvider";
import { ProtectedRoute } from "@/auth/ProtectedRoute";
import { Login } from "@/login/Login";
import { AccessDenied } from "@/pages/AccessDenied";
import { AuthCallback } from "@/pages/AuthCallback";
import { DashboardRouter } from "@/pages/DashboardRouter";
import { Register } from "@/pages/Register";

function currentPath() {
  return window.location.pathname || "/";
}

function AppRoutes() {
  const [path, setPath] = useState(currentPath);

  const navigate = useCallback((nextPath) => {
    window.history.pushState({}, "", nextPath);
    setPath(currentPath());
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    function syncPath() {
      setPath(currentPath());
    }

    window.addEventListener("popstate", syncPath);
    return () => window.removeEventListener("popstate", syncPath);
  }, []);

  const publicPage = useMemo(() => {
    if (path === "/login") {
      return <Login />;
    }

    if (path === "/register") {
      return <Register navigate={navigate} />;
    }

    if (path === "/auth/callback") {
      return <AuthCallback navigate={navigate} />;
    }

    if (path === "/access-denied") {
      return <AccessDenied />;
    }

    return null;
  }, [navigate, path]);

  if (publicPage) {
    return publicPage;
  }

  return (
    <ProtectedRoute>
      <DashboardRouter navigate={navigate} path={path} />
    </ProtectedRoute>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
