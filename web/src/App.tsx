import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import type { AuthResponse } from "@foodtrace/shared";
import { AppShell } from "./layout/AppShell";
import { ThemeProvider } from "./theme/ThemeContext";
import { LandingScreen } from "./screens/LandingScreen";
import { DashboardScreen } from "./screens/DashboardScreen";
import { MarketplaceScreen } from "./screens/MarketplaceScreen";
import { AssistantScreen } from "./screens/AssistantScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { PricingScreen } from "./screens/PricingScreen";
import { AboutScreen } from "./screens/AboutScreen";
import { TermsScreen } from "./screens/TermsScreen";
import { PrivacyScreen } from "./screens/PrivacyScreen";

function App() {
  const [session, setSession] = useState<AuthResponse | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");
    if (redirect) {
      const base = (import.meta as any).env.BASE_URL.replace(/\/$/, "");
      window.history.replaceState(null, "", base + redirect);
    }
  }, []);

  return (
    <ThemeProvider>
      <BrowserRouter basename={(import.meta as any).env.BASE_URL}>
        <Routes>
          <Route
            path="/"
            element={session ? <Navigate to="/dashboard" replace /> : <LandingScreen onSignIn={setSession} />}
          />
          {session ? (
            <Route element={<AppShell session={session} onSignOut={() => setSession(null)} />}>
              <Route path="/dashboard" element={<DashboardScreen />} />
              <Route path="/marketplace" element={<MarketplaceScreen />} />
              <Route path="/assistant" element={<AssistantScreen />} />
              <Route path="/profile" element={<ProfileScreen />} />
              <Route path="/pricing" element={<PricingScreen />} />
            </Route>
          ) : null}
          <Route path="/about" element={<AboutScreen />} />
          <Route path="/terms" element={<TermsScreen />} />
          <Route path="/privacy" element={<PrivacyScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
