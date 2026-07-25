import React, { useRef, useState } from "react";
import { Dimensions, FlatList, Pressable, StyleSheet, Text, View, type NativeSyntheticEvent, type NativeScrollEvent } from "react-native";
import { Logo } from "../components/Logo";
import { Icon, type IconName } from "../components/Icon";

const { width } = Dimensions.get("window");

interface Slide {
  icon: IconName;
  title: string;
  desc: string;
}

// Mirrors web's FEATURES/STEPS content (lib/brand.ts) - same six-feature
// story, condensed for a phone-sized swipeable intro instead of a scrolling
// marketing page.
const SLIDES: Slide[] = [
  { icon: "scan-outline", title: "Instant QR verification", desc: "Point, scan and get a clear Safe / Caution / Recalled verdict in seconds - no account required to check a product." },
  { icon: "git-network-outline", title: "Farm-to-shelf traceability", desc: "Every batch carries its full story: origin farm, inputs applied, processing steps and quality checks." },
  { icon: "alert-circle-outline", title: "Recall & expiry alerts", desc: "When a product is recalled or nearing expiry, everyone who scanned it is notified - instantly." },
  { icon: "storefront-outline", title: "Trusted marketplace", desc: "Farmers and manufacturers list verified stock; buyers scan the QR right from the feed before they commit." },
  { icon: "sparkles-outline", title: "AI safety assistant", desc: "Ask about a pesticide, a drug or a recall in plain English or Twi and get a grounded, sourced answer." },
];

export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);
  const isLast = index === SLIDES.length - 1;

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  }

  function next() {
    if (isLast) { onDone(); return; }
    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Logo size={22} fontSize={15} />
        <Pressable onPress={onDone} hitSlop={10}>
          <Text style={styles.skip}>Skip</Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.title}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={styles.iconRing}>
              <Icon name={item.icon} size={30} color="#18a2a6" />
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.desc}>{item.desc}</Text>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        <Pressable style={styles.nextBtn} onPress={next}>
          <Text style={styles.nextBtnText}>{isLast ? "Get started" : "Next"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#05080b" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 54, paddingBottom: 10 },
  skip: { color: "#93b9ac", fontSize: 13, fontWeight: "600" },
  slide: { alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  iconRing: { width: 96, height: 96, borderRadius: 48, backgroundColor: "rgba(119,199,162,0.12)", alignItems: "center", justifyContent: "center", marginBottom: 28 },
  icon: { fontSize: 42, color: "#77c7a2" },
  title: { color: "#f4f4ef", fontSize: 22, fontWeight: "800", textAlign: "center", marginBottom: 12 },
  desc: { color: "#93b9ac", fontSize: 14.5, lineHeight: 21, textAlign: "center" },
  footer: { paddingHorizontal: 24, paddingBottom: 36, paddingTop: 8 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 7, marginBottom: 22 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.15)" },
  dotActive: { backgroundColor: "#77c7a2", width: 20 },
  nextBtn: { backgroundColor: "#77c7a2", borderRadius: 14, paddingVertical: 15, alignItems: "center" },
  nextBtnText: { color: "#062014", fontWeight: "800", fontSize: 15 },
});
