import {
  FlatList,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../src/lib/api";
import { formatCurrency, getMarketplaceLabel } from "@repo/utils";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "#dcfce7",
  SOLD: "#dbeafe",
  DRAFT: "#f3f4f6",
  ENDED: "#f3f4f6",
  FAILED: "#fee2e2",
};

export default function ListingsScreen() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["mobile-listings"],
    queryFn: () => api.getListings(),
  });

  const listings = data?.data ?? [];

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={listings}
      keyExtractor={(item: any) => item.id}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.heading}>Listings</Text>
          <Text style={styles.count}>{data?.total ?? 0} listings</Text>
        </View>
      }
      ListEmptyComponent={
        !isLoading ? (
          <Text style={styles.empty}>No listings yet</Text>
        ) : null
      }
      renderItem={({ item }: { item: any }) => (
        <TouchableOpacity style={styles.row}>
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.meta}>
              {getMarketplaceLabel(item.marketplace)} ·{" "}
              {formatCurrency(Number(item.price))}
            </Text>
          </View>
          <View
            style={[
              styles.badge,
              { backgroundColor: STATUS_COLORS[item.status] ?? "#f3f4f6" },
            ]}
          >
            <Text style={styles.badgeText}>{item.status}</Text>
          </View>
        </TouchableOpacity>
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  content: { padding: 16 },
  header: { marginBottom: 16 },
  heading: { fontSize: 24, fontWeight: "700", color: "#111827" },
  count: { fontSize: 14, color: "#6b7280", marginTop: 2 },
  empty: { color: "#9ca3af", textAlign: "center", marginTop: 40 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  info: { flex: 1, marginRight: 12 },
  title: { fontSize: 14, fontWeight: "500", color: "#111827" },
  meta: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  badge: {
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 11, fontWeight: "600", color: "#374151" },
  separator: { height: 8 },
});
