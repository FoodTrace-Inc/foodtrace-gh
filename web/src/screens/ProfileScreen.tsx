import { useSession } from "../session/SessionContext";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <span style={{ color: "#93b9ac", fontSize: 13 }}>{label}</span>
      <span style={{ color: "#f4f4ef", fontSize: 13, fontWeight: 500 }}>{value}</span>
    </div>
  );
}

export function ProfileScreen() {
  const { session, signOut } = useSession();
  const { user } = session;

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

      <button
        type="button"
        onClick={signOut}
        style={{ padding: "12px 16px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.14)", background: "transparent", color: "#f4f4ef", fontWeight: 600, cursor: "pointer" }}
      >
        Log out
      </button>
    </div>
  );
}
