import { AiAssistantSection } from "../components/AiAssistantSection";

export function AssistantScreen() {
  return (
    <div style={{ display: "grid", gap: 20, maxWidth: 700 }}>
      <div>
        <p style={{ margin: 0, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#93b9ac" }}>Assistant</p>
        <h1 style={{ margin: "4px 0 0", fontSize: 24, color: "#f4f4ef" }}>Food and drug assistant</h1>
      </div>
      <AiAssistantSection />
    </div>
  );
}
