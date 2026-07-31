import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import type { AuthResponse } from "@foodtrace/shared";
import { AppShell } from "./layout/AppShell";
import { MarketingShell } from "./layout/MarketingShell";
import { ThemeProvider } from "./theme/ThemeContext";
import { HomeScreen } from "./screens/HomeScreen";
import { AboutScreen } from "./screens/AboutScreen";
import { FeaturesScreen } from "./screens/FeaturesScreen";
import { PublicPricingScreen } from "./screens/PublicPricingScreen";
import { SignInScreen } from "./screens/SignInScreen";
import { DashboardScreen } from "./screens/DashboardScreen";
import { MarketplaceScreen } from "./screens/MarketplaceScreen";
import { AssistantScreen } from "./screens/AssistantScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { PricingScreen } from "./screens/PricingScreen";
import { TermsScreen } from "./screens/TermsScreen";
import { PrivacyScreen } from "./screens/PrivacyScreen";
import { ScrollToTop } from "./components/ScrollToTop";
import { apiBase } from "./lib/api";

function App() {
  const [session, setSession] = useState<AuthResponse | null>(null);

  function signOut() {
    if (session?.token) {
      fetch(`${apiBase}/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
      }).catch(() => { /* best effort - local sign-out still proceeds */ });
    }
    setSession(null);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");
    if (redirect) {
      const base = (import.meta as any).env.BASE_URL.replace(/\/$/, "");
      window.history.replaceState(null, "", base + redirect);
      // BrowserRouter only re-evaluates the current route on "popstate" - a
      // plain replaceState() changes the address bar but leaves the app
      // rendering whatever matched "/" on first paint. Dispatching a
      // synthetic popstate makes react-router pick up the corrected path,
      // so a direct link/refresh to e.g. /pricing actually lands there
      // instead of silently falling back to the landing page.
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  }, []);

  return (
    <ThemeProvider>
      <BrowserRouter basename={(import.meta as any).env.BASE_URL}>
        <ScrollToTop />
        <Routes>
          {session ? (
            <>
              {/* Signed in: the app shell owns everything; "/" jumps to the dashboard. */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/signin" element={<Navigate to="/dashboard" replace />} />
              <Route element={<AppShell session={session} onSignOut={signOut} />}>
                <Route path="/dashboard" element={<DashboardScreen />} />
                <Route path="/marketplace" element={<MarketplaceScreen />} />
                <Route path="/assistant" element={<AssistantScreen />} />
                <Route path="/profile" element={<ProfileScreen />} />
                <Route path="/pricing" element={<PricingScreen />} />
              </Route>
              <Route path="/terms" element={<TermsScreen />} />
              <Route path="/privacy" element={<PrivacyScreen />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </>
          ) : (
            <>
              {/* Public marketing site */}
              <Route element={<MarketingShell />}>
                <Route path="/" element={<HomeScreen />} />
                <Route path="/features" element={<FeaturesScreen />} />
                <Route path="/about" element={<AboutScreen />} />
                <Route path="/pricing" element={<PublicPricingScreen />} />
                <Route path="/terms" element={<TermsScreen />} />
                <Route path="/privacy" element={<PrivacyScreen />} />
              </Route>
              <Route path="/signin" element={<SignInScreen onSignIn={setSession} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          )}
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
