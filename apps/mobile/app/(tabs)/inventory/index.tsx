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
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { api } from "../../../src/lib/api";
import { formatCurrency } from "@repo/utils";

export default function InventoryScreen() {
  const router = useRouter();
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
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <View>
            <Text style={styles.heading}>Inventory</Text>
            <Text style={styles.count}>{data?.total ?? 0} items</Text>
          </View>
          <View style={styles.headerBtns}>
            <TouchableOpacity
              style={styles.importBtn}
              onPress={() => router.push("/(tabs)/inventory/import" as any)}
            >
              <Feather name="download" size={15} color="#ea580c" />
              <Text style={styles.importBtnText}>Import</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => router.push("/(tabs)/inventory/new")}
            >
              <Feather name="plus" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      }
      ListEmptyComponent={
        !isLoading ? (
          <View style={styles.emptyWrap}>
            <Feather name="package" size={40} color="#d1d5db" />
            <Text style={styles.empty}>No inventory items yet</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push("/(tabs)/inventory/new")}
            >
              <Text style={styles.emptyBtnText}>Add your first item</Text>
            </TouchableOpacity>
          </View>
        ) : null
      }
      numColumns={2}
      columnWrapperStyle={styles.row}
      renderItem={({ item }: { item: any }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push(`/(tabs)/inventory/${item.id}` as any)}
        >
          {item.images?.[0] ? (
            <Image
              source={{ uri: item.images[0].url }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Feather name="image" size={24} color="#9ca3af" />
            </View>
          )}
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={styles.cardMeta}>
              <Text style={styles.price}>
                {item.targetPrice ? formatCurrency(Number(item.targetPrice)) : "—"}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  item.status === "ACTIVE" && styles.statusActive,
                ]}
              >
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
  content: { padding: 16, paddingBottom: 32 },
  header: {
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heading: { fontSize: 24, fontWeight: "700", color: "#111827" },
  count: { fontSize: 14, color: "#6b7280", marginTop: 2 },
  headerBtns: { flexDirection: "row", alignItems: "center", gap: 8 },
  importBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    borderWidth: 1.5, borderColor: "#ea580c",
    borderRadius: 19, paddingHorizontal: 12, paddingVertical: 8,
  },
  importBtnText: { fontSize: 13, fontWeight: "600", color: "#ea580c" },
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
