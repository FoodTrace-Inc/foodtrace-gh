import { createContext, useContext } from "react";
import type { AuthResponse } from "@foodtrace/shared";

export interface SessionContextValue {
  session: AuthResponse;
  signOut: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export const SessionProvider = SessionContext.Provider;

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within an authenticated route");
  return ctx;
}
