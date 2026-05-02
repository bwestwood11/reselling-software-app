import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { formatCurrency, centsToDecimal } from "@repo/utils";
import {
  useInventoryItem,
  useDeleteInventoryItem,
} from "../../../src/hooks/use-inventory";

const CONDITION_LABELS: Record<string, string> = {
  NEW_WITH_TAGS: "New with tags",
  NEW_WITHOUT_TAGS: "New without tags",
  VERY_GOOD: "Very good",
  GOOD: "Good",
  SATISFACTORY: "Satisfactory",
};

const STATUS_BG: Record<string, string> = {
  DRAFT: "#f3f4f6",
  ACTIVE: "#dcfce7",
  SOLD: "#dbeafe",
  ARCHIVED: "#f3f4f6",
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function InventoryItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: item, isLoading } = useInventoryItem(id);
  const deleteMutation = useDeleteInventoryItem();

  function confirmDelete() {
    Alert.alert("Delete Item", "This will permanently delete the item.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteMutation.mutateAsync(id);
            router.back();
          } catch {
            Alert.alert("Error", "Failed to delete item.");
          }
        },
      },
    ]);
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#ea580c" />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFound}>Item not found</Text>
      </View>
    );
  }

  const images: any[] = item.images ?? [];
  const listings: any[] = item.listings ?? [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Image carousel */}
      {images.length > 0 ? (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.carousel}
        >
          {images.map((img: any, i: number) => (
            <Image
              key={i}
              source={{ uri: img.url }}
              style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH }}
              resizeMode="cover"
            />
          ))}
        </ScrollView>
      ) : (
        <View style={styles.noImage}>
          <Feather name="image" size={48} color="#d1d5db" />
          <Text style={styles.noImageText}>No photos</Text>
        </View>
      )}
      {images.length > 1 && (
        <Text style={styles.imageCount}>
          {images.length} photo{images.length !== 1 ? "s" : ""}
        </Text>
      )}

      <View style={styles.body}>
        {/* Title + status */}
        <View style={styles.titleRow}>
          <Text style={styles.title}>{item.title}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: STATUS_BG[item.status] ?? "#f3f4f6" },
            ]}
          >
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>

        {item.targetPrice != null && (
          <Text style={styles.price}>
            {formatCurrency(Number(item.targetPrice))}
          </Text>
        )}

        {/* Details */}
        <View style={styles.card}>
          {item.condition && (
            <DetailRow
              label="Condition"
              value={CONDITION_LABELS[item.condition] ?? item.condition}
            />
          )}
          {item.brand && <DetailRow label="Brand" value={item.brand} />}
          {item.category && <DetailRow label="Category" value={item.category} />}
          {item.quantity != null && (
            <DetailRow label="Quantity" value={String(item.quantity)} last />
          )}
          {item.costPrice != null && (
            <DetailRow
              label="Cost price"
              value={formatCurrency(Number(item.costPrice))}
              last
            />
          )}
        </View>

        {item.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Description</Text>
            <Text style={styles.descText}>{item.description}</Text>
          </View>
        ) : null}

        {/* Existing listings */}
        {listings.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              Listings ({listings.length})
            </Text>
            {listings.map((l: any) => (
              <View key={l.id} style={styles.listingRow}>
                <Text style={styles.listingMarketplace}>{l.marketplace}</Text>
                <View
                  style={[
                    styles.listingBadge,
                    l.status === "ACTIVE" && styles.listingBadgeActive,
                  ]}
                >
                  <Text style={styles.listingBadgeText}>{l.status}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Actions */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() =>
            router.push({
              pathname: "/(tabs)/listings/new",
              params: { inventoryItemId: item.id },
            })
          }
        >
          <Feather name="tag" size={17} color="#fff" />
          <Text style={styles.primaryBtnText}>Create Listing</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteRow} onPress={confirmDelete}>
          <Feather name="trash-2" size={15} color="#ef4444" />
          <Text style={styles.deleteText}>Delete Item</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function DetailRow({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.detailRow, last && styles.detailRowLast]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  content: { paddingBottom: 48 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  notFound: { color: "#6b7280", fontSize: 16 },
  carousel: { backgroundColor: "#f3f4f6" },
  noImage: {
    height: 200,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  noImageText: { color: "#9ca3af", fontSize: 14 },
  imageCount: {
    textAlign: "center",
    fontSize: 12,
    color: "#9ca3af",
    paddingVertical: 6,
    backgroundColor: "#f3f4f6",
  },
  body: { padding: 16 },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 4,
  },
  title: { flex: 1, fontSize: 20, fontWeight: "700", color: "#111827" },
  statusBadge: {
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  statusText: { fontSize: 11, fontWeight: "600", color: "#374151" },
  price: {
    fontSize: 22,
    fontWeight: "700",
    color: "#ea580c",
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  detailRowLast: { borderBottomWidth: 0 },
  detailLabel: { fontSize: 13, color: "#6b7280" },
  detailValue: { fontSize: 13, fontWeight: "500", color: "#111827" },
  section: { marginBottom: 16 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  descText: { fontSize: 14, color: "#374151", lineHeight: 21 },
  listingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
  },
  listingMarketplace: { fontSize: 13, fontWeight: "500", color: "#111827" },
  listingBadge: {
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: "#f3f4f6",
  },
  listingBadgeActive: { backgroundColor: "#dcfce7" },
  listingBadgeText: { fontSize: 11, fontWeight: "600", color: "#374151" },
  primaryBtn: {
    backgroundColor: "#ea580c",
    borderRadius: 12,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 10,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  deleteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  deleteText: { color: "#ef4444", fontWeight: "600", fontSize: 14 },
});
