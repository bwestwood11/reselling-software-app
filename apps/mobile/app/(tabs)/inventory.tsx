import {
  FlatList,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  Image,
  TouchableOpacity,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../src/lib/api";
import { formatCurrency } from "@repo/utils";

export default function InventoryScreen() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["mobile-inventory"],
    queryFn: () => api.getInventory(),
  });

  const items = data?.data ?? [];

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={items}
      keyExtractor={(item: any) => item.id}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.heading}>Inventory</Text>
          <Text style={styles.count}>{data?.total ?? 0} items</Text>
        </View>
      }
      ListEmptyComponent={
        !isLoading ? (
          <Text style={styles.empty}>No inventory items yet</Text>
        ) : null
      }
      numColumns={2}
      columnWrapperStyle={styles.row}
      renderItem={({ item }: { item: any }) => (
        <TouchableOpacity style={styles.card}>
          {item.images?.[0] ? (
            <Image
              source={{ uri: item.images[0].url }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderText}>No image</Text>
            </View>
          )}
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
            <View style={styles.cardMeta}>
              <Text style={styles.price}>
                {item.targetPrice ? formatCurrency(Number(item.targetPrice)) : "—"}
              </Text>
              <View style={[styles.statusBadge, item.status === "ACTIVE" && styles.statusActive]}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      )}
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
  row: { gap: 12, marginBottom: 12 },
  card: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  image: { width: "100%", aspectRatio: 1 },
  imagePlaceholder: {
    aspectRatio: 1,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholderText: { color: "#9ca3af", fontSize: 12 },
  cardBody: { padding: 10 },
  cardTitle: { fontSize: 13, fontWeight: "500", color: "#111827" },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  price: { fontSize: 13, fontWeight: "600", color: "#1d4ed8" },
  statusBadge: {
    borderRadius: 99,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "#f3f4f6",
  },
  statusActive: { backgroundColor: "#dcfce7" },
  statusText: { fontSize: 10, fontWeight: "600", color: "#374151" },
});
