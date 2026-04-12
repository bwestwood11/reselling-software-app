import { ScrollView, View, Text, StyleSheet, RefreshControl } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../src/lib/api";
import { formatCurrency } from "@repo/utils";

export default function DashboardScreen() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["mobile-dashboard"],
    queryFn: api.getDashboardStats,
  });

  const stats = data?.data;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
    >
      <Text style={styles.heading}>Dashboard</Text>

      <View style={styles.statsGrid}>
        <StatCard
          label="Inventory"
          value={String(stats?.totalInventory ?? 0)}
          color="#dbeafe"
          textColor="#1d4ed8"
        />
        <StatCard
          label="Active Listings"
          value={String(stats?.activeListings ?? 0)}
          color="#dcfce7"
          textColor="#15803d"
        />
        <StatCard
          label="Sold This Month"
          value={String(stats?.soldThisMonth ?? 0)}
          color="#f3e8ff"
          textColor="#7e22ce"
        />
        <StatCard
          label="Total Revenue"
          value={formatCurrency(stats?.totalRevenue ?? 0)}
          color="#ffedd5"
          textColor="#c2410c"
        />
      </View>

      <Text style={styles.sectionTitle}>Recent Activity</Text>
      {stats?.recentSyncEvents.length === 0 ? (
        <Text style={styles.empty}>No recent activity</Text>
      ) : (
        stats?.recentSyncEvents.map((event) => (
          <View key={event.id} style={styles.eventRow}>
            <View style={styles.eventInfo}>
              <Text style={styles.eventTitle} numberOfLines={1}>
                {event.listingTitle}
              </Text>
              <Text style={styles.eventMeta}>
                {event.marketplace} · {event.type}
              </Text>
            </View>
            <View
              style={[
                styles.badge,
                event.status === "success" && styles.badgeSuccess,
                event.status === "failed" && styles.badgeFailed,
              ]}
            >
              <Text style={styles.badgeText}>{event.status}</Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function StatCard({
  label,
  value,
  color,
  textColor,
}: {
  label: string;
  value: string;
  color: string;
  textColor: string;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: color }]}>
      <Text style={[styles.statValue, { color: textColor }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 16 },
  heading: { fontSize: 24, fontWeight: "700", color: "#111827", marginBottom: 16 },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: "47%",
    borderRadius: 12,
    padding: 16,
  },
  statValue: { fontSize: 24, fontWeight: "700" },
  statLabel: { fontSize: 12, marginTop: 4, opacity: 0.8 },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#374151", marginBottom: 12 },
  empty: { color: "#9ca3af", fontSize: 14 },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  eventInfo: { flex: 1, marginRight: 8 },
  eventTitle: { fontSize: 14, fontWeight: "500", color: "#111827" },
  eventMeta: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  badge: {
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: "#e5e7eb",
  },
  badgeSuccess: { backgroundColor: "#dcfce7" },
  badgeFailed: { backgroundColor: "#fee2e2" },
  badgeText: { fontSize: 11, fontWeight: "600", color: "#374151" },
});
