import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSession } from "../session/SessionContext";
import { apiBase, fetchWithTimeout } from "../lib/api";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <span style={{ color: "#93b9ac", fontSize: 13 }}>{label}</span>
      <span style={{ color: "#f4f4ef", fontSize: 13, fontWeight: 500 }}>{value}</span>
    </div>
  );
}

interface SubscriptionStatus {
  plan: string;
  status: string;
  expiryDate: string;
  daysLeft: number;
}

export function ProfileScreen() {
  const { session, signOut } = useSession();
  const { user } = session;
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);

  useEffect(() => {
    fetchWithTimeout(`${apiBase}/payments/subscription/${user.id}`, {
      headers: { Authorization: `Bearer ${session.token}` },
    })
      .then((r) => r.json())
      .then(setSubscription)
      .catch(() => {});
  }, [user.id, session.token]);

  const isActive = subscription?.status === "active";

  return (
    <div style={{ display: "grid", gap: 20, maxWidth: 480 }}>
      <div>
        <p style={{ margin: 0, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#93b9ac" }}>Profile</p>
        <h1 style={{ margin: "4px 0 0", fontSize: 24, color: "#f4f4ef" }}>Your account</h1>
      </div>

      <div style={{ background: "linear-gradient(135deg, #14251d 0%, #0b0f13 60%)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 24 }}>
        <Row label="Full name" value={user.fullName || "N/A"} />
        <Row label="Email" value={user.email || "N/A"} />
        <Row label="Phone" value={user.phone || "N/A"} />
        <Row label="Role" value={user.role} />
        <Row label="Language" value={user.language} />
        <Row label="Verified" value={user.isVerified ? "Yes" : "No"} />
      </div>

      <div style={{ background: "linear-gradient(135deg, #14251d 0%, #0b0f13 60%)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 24 }}>
        <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: "#f4f4ef", textTransform: "uppercase", letterSpacing: 1 }}>Subscription</p>
        <Row label="Plan" value={subscription?.plan && subscription.plan !== "none" ? subscription.plan : "None"} />
        <Row label="Status" value={subscription?.status ?? "None"} />
        {subscription && subscription.plan !== "none" ? (
          <>
            <Row label="Days remaining" value={String(subscription.daysLeft)} />
            <Row label="Next payment" value={subscription.expiryDate} />
          </>
        ) : null}
        <Link
          to="/pricing"
          style={{ display: "inline-block", marginTop: 14, padding: "10px 16px", borderRadius: 12, background: "#77c7a2", color: "#062014", fontWeight: 700, fontSize: 13, textDecoration: "none" }}
        >
          {isActive ? "Upgrade plan" : "Choose a plan"}
        </Link>
      </div>

      <button
        type="button"
        onClick={signOut}
        style={{ padding: "12px 16px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.14)", background: "transparent", color: "#f4f4ef", fontWeight: 600, cursor: "pointer" }}
      >
        Log out
      </button>

      <div style={{ display: "flex", gap: 16, fontSize: 12, justifyContent: "center" }}>
        <Link to="/about" style={{ color: "#93b9ac", textDecoration: "none" }}>About</Link>
        <Link to="/terms" style={{ color: "#93b9ac", textDecoration: "none" }}>Terms</Link>
        <Link to="/privacy" style={{ color: "#93b9ac", textDecoration: "none" }}>Privacy</Link>
      </div>
    </div>
  );
}
