import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";

const settingsItems = [
  { icon: "link", label: "Marketplace Connections", subtitle: "Connect eBay, Depop and more" },
  { icon: "user", label: "Profile", subtitle: "Name, email, and password" },
  { icon: "bell", label: "Notifications", subtitle: "Sync alerts and updates" },
  { icon: "help-circle", label: "Help & Support", subtitle: "Documentation and contact" },
];

export default function SettingsScreen() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Settings</Text>

      <View style={styles.section}>
        {settingsItems.map((item, i) => (
          <TouchableOpacity
            key={item.label}
            style={[
              styles.row,
              i === 0 && styles.rowFirst,
              i === settingsItems.length - 1 && styles.rowLast,
            ]}
          >
            <View style={styles.iconWrap}>
              <Feather name={item.icon as any} size={18} color="#6b7280" />
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowLabel}>{item.label}</Text>
              <Text style={styles.rowSub}>{item.subtitle}</Text>
            </View>
            <Feather name="chevron-right" size={16} color="#d1d5db" />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.signOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 16 },
  heading: { fontSize: 24, fontWeight: "700", color: "#111827", marginBottom: 20 },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  rowFirst: {},
  rowLast: { borderBottomWidth: 0 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  rowInfo: { flex: 1 },
  rowLabel: { fontSize: 14, fontWeight: "500", color: "#111827" },
  rowSub: { fontSize: 12, color: "#9ca3af", marginTop: 1 },
  signOut: {
    backgroundColor: "#fee2e2",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
  },
  signOutText: { color: "#dc2626", fontWeight: "600" },
});
