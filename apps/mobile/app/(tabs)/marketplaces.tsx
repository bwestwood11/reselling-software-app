import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { BrandHeader } from "../../src/components/BrandHeader";

export default function MarketplacesScreen() {
  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <BrandHeader />

      <View style={s.body}>
        <View style={s.iconWrap}>
          <Feather name="shopping-bag" size={32} color="#ea580c" />
        </View>
        <Text style={s.title}>Marketplaces</Text>
        <Text style={s.sub}>This screen is coming soon.</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f6f5f3" },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: "#fff7ed",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: { fontSize: 18, fontWeight: "700", color: "#09090b" },
  sub: { fontSize: 14, color: "#71717a", textAlign: "center" },
});
