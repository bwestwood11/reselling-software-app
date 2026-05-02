import {
  FlatList,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { api } from "../../../src/lib/api";
import { formatCurrency, getMarketplaceLabel } from "@repo/utils";
import { useDelistListing, useMarkSold } from "../../../src/hooks/use-listings";

const STATUS_BG: Record<string, string> = {
  ACTIVE: "#dcfce7",
  SOLD: "#dbeafe",
  DRAFT: "#f3f4f6",
  ENDED: "#f3f4f6",
  FAILED: "#fee2e2",
  PENDING: "#fef9c3",
};

export default function ListingsScreen() {
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["mobile-listings"],
    queryFn: () => api.getListings(),
  });
  const delistMutation = useDelistListing();
  const markSoldMutation = useMarkSold();

  const listings = data?.data ?? [];

  function showActions(listing: any) {
    const options: { text: string; onPress: () => void; style?: "destructive" | "cancel" }[] = [];

    if (listing.status === "ACTIVE") {
      options.push({
        text: "Delist",
        onPress: () =>
          delistMutation.mutate(listing.id, {
            onError: (err) =>
              Alert.alert("Error", err instanceof Error ? err.message : "Failed"),
          }),
      });
      options.push({
        text: "Mark as Sold",
        onPress: () =>
          markSoldMutation.mutate(listing.id, {
            onError: (err) =>
              Alert.alert("Error", err instanceof Error ? err.message : "Failed"),
          }),
      });
    }

    options.push({ text: "Cancel", style: "cancel", onPress: () => {} });
    Alert.alert(listing.title, undefined, options);
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={listings}
      keyExtractor={(item: any) => item.id}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <View>
            <Text style={styles.heading}>Listings</Text>
            <Text style={styles.count}>{data?.total ?? 0} listings</Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push("/(tabs)/listings/new")}
          >
            <Feather name="plus" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      }
      ListEmptyComponent={
        !isLoading ? (
          <View style={styles.emptyWrap}>
            <Feather name="tag" size={40} color="#d1d5db" />
            <Text style={styles.empty}>No listings yet</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push("/(tabs)/listings/new")}
            >
              <Text style={styles.emptyBtnText}>Create a listing</Text>
            </TouchableOpacity>
          </View>
        ) : null
      }
      renderItem={({ item }: { item: any }) => (
        <TouchableOpacity style={styles.row} onLongPress={() => showActions(item)}>
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.meta}>
              {getMarketplaceLabel(item.marketplace)} ·{" "}
              {formatCurrency(Number(item.price))}
            </Text>
          </View>
          <View
            style={[
              styles.badge,
              { backgroundColor: STATUS_BG[item.status] ?? "#f3f4f6" },
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
  content: { padding: 16, paddingBottom: 32 },
  header: {
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heading: { fontSize: 24, fontWeight: "700", color: "#111827" },
  count: { fontSize: 14, color: "#6b7280", marginTop: 2 },
  addBtn: {
    backgroundColor: "#ea580c",
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyWrap: { alignItems: "center", marginTop: 60, gap: 12 },
  empty: { color: "#9ca3af", fontSize: 15 },
  emptyBtn: {
    backgroundColor: "#ea580c",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 4,
  },
  emptyBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
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
  badge: { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: "600", color: "#374151" },
  separator: { height: 8 },
});
