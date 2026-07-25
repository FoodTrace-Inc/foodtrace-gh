import { useSession } from "../session/SessionContext";
import { MarketplaceSection } from "../components/MarketplaceSection";

export function MarketplaceScreen() {
  const { session } = useSession();
  return (
    <div style={{ display: "grid", gap: 20, maxWidth: 900 }}>
      <div>
        <p style={{ margin: 0, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#93b9ac" }}>Marketplace</p>
        <h1 style={{ margin: "4px 0 0", fontSize: 24, color: "#f4f4ef" }}>
          {session.user.role === "regulator" ? "All listings, including pending review" : "Verified listings from the network"}
        </h1>
      </div>
      <MarketplaceSection session={session} />
    </div>
  );
}
