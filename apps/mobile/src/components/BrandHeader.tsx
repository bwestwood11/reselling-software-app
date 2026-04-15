import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

/**
 * Persistent top header shown on every tab screen — the mobile equivalent
 * of the web sidebar's brand section.
 */
export function BrandHeader() {
  return (
    <View style={s.header}>
      <View style={s.badge}>
        <Feather name="shopping-bag" size={18} color="#fff" />
      </View>
      <View style={s.text}>
        <Text style={s.name}>ReList</Text>
        <Text style={s.sub}>Seller Workspace</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fbfaf8",
    borderBottomWidth: 1,
    borderBottomColor: "#e4e4e7",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#ea580c",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#ea580c",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  text: { gap: 1 },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: "#09090b",
    letterSpacing: -0.3,
  },
  sub: {
    fontSize: 11,
    color: "#71717a",
    fontWeight: "500",
  },
});
