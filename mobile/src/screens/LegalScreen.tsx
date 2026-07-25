import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { usePalette } from "../theme/ThemeContext";

type Tab = "about" | "terms" | "privacy";

interface Props {
  onBack: () => void;
}

export function LegalScreen({ onBack }: Props) {
  const p = usePalette();
  const [tab, setTab] = useState<Tab>("about");

  return (
    <View style={{ flex: 1, backgroundColor: p.pageBg }}>
      <View style={{ padding: 18, paddingBottom: 0 }}>
        <Pressable onPress={onBack} hitSlop={10} style={{ marginBottom: 12 }}>
          <Text style={{ color: p.accent, fontWeight: "700" }}>{"< Back"}</Text>
        </Pressable>
        <View style={styles.tabRow}>
          {(["about", "terms", "privacy"] as Tab[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={[styles.tabBtn, { backgroundColor: tab === t ? p.accent : "transparent", borderColor: p.border }]}
            >
              <Text style={{ color: tab === t ? p.onAccent : p.textSecondary, fontWeight: "700", fontSize: 12.5, textTransform: "capitalize" }}>
                {t === "terms" ? "Terms" : t === "privacy" ? "Privacy" : "About"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: 18, paddingTop: 6 }}>
        {tab === "about" ? <AboutBody color={p.textPrimary} sub={p.textSecondary} /> : null}
        {tab === "terms" ? <TermsBody color={p.textPrimary} sub={p.textSecondary} /> : null}
        {tab === "privacy" ? <PrivacyBody color={p.textPrimary} sub={p.textSecondary} /> : null}
      </ScrollView>
    </View>
  );
}

function H({ children, color }: { children: string; color: string }) {
  return <Text style={{ color, fontSize: 15, fontWeight: "700", marginTop: 16, marginBottom: 6 }}>{children}</Text>;
}
function P({ children, color }: { children: string; color: string }) {
  return <Text style={{ color, fontSize: 13.5, lineHeight: 20, marginBottom: 4 }}>{children}</Text>;
}

function AboutBody({ color, sub }: { color: string; sub: string }) {
  return (
    <>
      <P color={sub}>
        FoodTrace GH connects consumers, farmers, manufacturers, pharmacists, and the Ghana FDA in one
        traceability platform. Scan a QR code on a product to instantly see whether it's verified
        safe, under caution, or recalled.
      </P>
      <H color={color}>Disclaimer</H>
      <P color={sub}>
        Product safety information is sourced from the Ghana FDA public register and from data
        submitted by manufacturers and pharmacies. FoodTrace GH is not affiliated with or endorsed by
        the Ghana FDA. Always consult a qualified health professional before making decisions about
        medicines.
      </P>
    </>
  );
}

function TermsBody({ color, sub }: { color: string; sub: string }) {
  return (
    <>
      <P color={sub}>By using FoodTrace GH, you agree to these terms.</P>
      <H color={color}>Subscriptions and payments</H>
      <P color={sub}>
        Manufacturer and pharmacist accounts need an active subscription to list products and
        generate QR codes, billed monthly through Paystack. Consumers get 20 free scans/month, with an
        optional premium plan for unlimited scans. Subscriptions auto-renew unless cancelled.
      </P>
      <H color={color}>No warranty</H>
      <P color={sub}>
        FoodTrace GH is provided "as is." Scan results may not be complete or error-free — always use
        independent judgment, especially for medicines.
      </P>
    </>
  );
}

function PrivacyBody({ color, sub }: { color: string; sub: string }) {
  return (
    <>
      <P color={sub}>
        We collect your account details (name, phone/email, role), your scan and report activity, and
        — for sellers — the products and batches you list. Paystack handles your card/Mobile Money
        details directly; we never see your card number or PIN.
      </P>
      <H color={color}>Third parties</H>
      <P color={sub}>Paystack (payments), Resend (email), and Expo (push notifications).</P>
      <H color={color}>Your choices</H>
      <P color={sub}>
        Cancel your subscription anytime from Account. Contact support to request account deletion.
      </P>
    </>
  );
}

const styles = StyleSheet.create({
  tabRow: { flexDirection: "row", gap: 8, marginBottom: 6 },
  tabBtn: { flex: 1, borderRadius: 10, paddingVertical: 9, alignItems: "center", borderWidth: 1 },
});
