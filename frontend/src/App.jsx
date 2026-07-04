import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Sidebar from "./components/layout/Sidebar";
import TopBar from "./components/layout/TopBar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Exercises from "./pages/Exercises";
import Simulations from "./pages/Simulations";
import DetectionGaps from "./pages/DetectionGaps";
import PurpleScore from "./pages/PurpleScore";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";

const pages = {
  dashboard: Dashboard,
  exercises: Exercises,
  simulations: Simulations,
  gaps: DetectionGaps,
  score: PurpleScore,
  reports: Reports,
  settings: Settings,
};

function AuthGate() {
  const [authView, setAuthView] = useState("login");

  if (authView === "register") {
    return <Register onSwitchToLogin={() => setAuthView("login")} />;
  }
  return <Login onSwitchToRegister={() => setAuthView("register")} />;
}

function AuthenticatedApp() {
  const [activePage, setActivePage] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const PageComponent = pages[activePage] || Dashboard;

  return (
    <div className="app-layout">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
      />

      <main
        className="main-content"
        style={{
          marginLeft: sidebarCollapsed
            ? "var(--sidebar-collapsed-width)"
            : "var(--sidebar-width)",
        }}
      >
        <TopBar activePage={activePage} />
        <div className="page-body">
          <PageComponent />
        </div>
      </main>
    </div>
  );
}

function AppShell() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <AuthenticatedApp /> : <AuthGate />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
