export function passwordScore(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*]/.test(password)) score++;
  return score;
}

export function isPasswordStrongEnough(password: string): boolean {
  return passwordScore(password) === 4;
}

const LEVELS = [
  { color: "#3a4a42", label: "" },
  { color: "#e0475c", label: "Too weak" },
  { color: "#e0475c", label: "Too weak" },
  { color: "#E0A83B", label: "Getting better" },
  { color: "#4ade80", label: "Strong password" },
];

export function PasswordStrengthMeter({ password }: { password: string }) {
  const score = passwordScore(password);
  const level = LEVELS[score];
  return (
    <div style={{ marginTop: -8, marginBottom: 4 }}>
      <div style={{ height: 5, borderRadius: 3, background: "#1c2620", overflow: "hidden" }}>
        <div style={{ height: 5, borderRadius: 3, width: `${(score / 4) * 100}%`, background: level.color, transition: "width 0.15s ease" }} />
      </div>
      {password.length > 0 ? (
        <p style={{ fontSize: 11, marginTop: 5, marginBottom: 0, color: level.color }}>
          {score === 4 ? "✓ " : ""}
          {level.label || "Must be at least 8 characters, with an uppercase letter, a number, and a special character (!@#$%^&*)."}
        </p>
      ) : null}
    </div>
  );
}
