import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { api } from "../../../src/lib/api";
import { formatCurrency } from "@repo/utils";

type Status = "active" | "ended" | "sold";

interface ImportableItem {
  ebayItemId: string;
  title: string;
  price: number;
  quantity: number;
  categoryName: string;
  imageUrl: string | null;
  listingStatus: string;
  isImported: boolean;
  listedAt: string | null;
}

const STATUS_TABS: { key: Status; label: string }[] = [
  { key: "active", label: "Active" },
  { key: "ended", label: "Ended" },
  { key: "sold", label: "Sold" },
];

export default function ImportScreen() {
  const router = useRouter();
  const qc = useQueryClient();

  const [status, setStatus] = useState<Status>("active");
  const [showImported, setShowImported] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [importing, setImporting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchInput]);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["ebay-importable", status, showImported, page, search],
    queryFn: () =>
      api.getImportableListings({ status, showImported, page, limit: 30, search }),
    staleTime: 60_000,
  });

  const items: ImportableItem[] = data?.data ?? [];
  const totalPages: number = data?.totalPages ?? 1;
  const total: number = data?.total ?? 0;
  const importableItems = items.filter((i) => !i.isImported);
  const allSelected =
    importableItems.length > 0 && importableItems.every((i) => selected.has(i.ebayItemId));

  function handleStatusChange(next: Status) {
    setStatus(next);
    setPage(1);
    setSelected(new Set());
  }

  function toggleItem(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(importableItems.map((i) => i.ebayItemId)));
    }
  }

  const handleRefresh = useCallback(async () => {
    setSelected(new Set());
    await refetch();
  }, [refetch]);

  async function handleImport() {
    if (selected.size === 0 || importing) return;
    setImporting(true);
    try {
      const res = await api.importEbayItems([...selected]);
      const result = res.data as {
        imported: string[];
        skipped: string[];
        failed: Array<{ id: string; error: string }>;
      };

      setSelected(new Set());
      await qc.invalidateQueries({ queryKey: ["mobile-inventory"] });
      await refetch();

      const parts: string[] = [];
      if (result.imported.length > 0)
        parts.push(`${result.imported.length} item${result.imported.length !== 1 ? "s" : ""} imported`);
      if (result.skipped.length > 0)
        parts.push(`${result.skipped.length} already existed`);
      if (result.failed.length > 0)
        parts.push(`${result.failed.length} failed`);

      Alert.alert(
        result.failed.length === 0 ? "Import Complete" : "Import Finished with Errors",
        parts.join("\n"),
      );
    } catch (err) {
      Alert.alert("Import Failed", err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setImporting(false);
    }
  }

  const renderItem = useCallback(({ item }: { item: ImportableItem }) => {
    const isSelected = selected.has(item.ebayItemId);
    const isImported = item.isImported;

    return (
      <TouchableOpacity
        style={[
          s.row,
          isImported && s.rowImported,
          isSelected && s.rowSelected,
        ]}
        onPress={() => !isImported && toggleItem(item.ebayItemId)}
        activeOpacity={isImported ? 1 : 0.7}
      >
        {/* Checkbox */}
        <View style={[s.checkbox, isSelected && s.checkboxSelected, isImported && s.checkboxImported]}>
          {isImported ? (
            <Feather name="check" size={11} color="#9ca3af" />
          ) : isSelected ? (
            <Feather name="check" size={11} color="#fff" />
          ) : null}
        </View>

        {/* Thumbnail */}
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={s.thumb} resizeMode="cover" />
        ) : (
          <View style={[s.thumb, s.thumbEmpty]}>
            <Feather name="package" size={18} color="#d1d5db" />
          </View>
        )}

        {/* Info */}
        <View style={s.info}>
          <Text style={s.itemTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={s.itemMeta} numberOfLines={1}>
            Qty {item.quantity}
            {item.categoryName ? ` · ${item.categoryName}` : ""}
            {item.listedAt ? ` · ${new Date(item.listedAt).toLocaleDateString()}` : ""}
          </Text>
        </View>

        {/* Right side */}
        <View style={s.right}>
          <Text style={s.price}>{formatCurrency(item.price)}</Text>
          <View style={[
            s.badge,
            isImported ? s.badgeImported
              : item.listingStatus === "Active" ? s.badgeActive
              : s.badgeDefault,
          ]}>
            <Text style={[
              s.badgeText,
              isImported ? s.badgeTextImported
                : item.listingStatus === "Active" ? s.badgeTextActive
                : s.badgeTextDefault,
            ]}>
              {isImported ? "Imported" : item.listingStatus}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [selected]);

  return (
    <SafeAreaView style={s.root} edges={["bottom"]}>
      {/* Search + filters */}
      <View style={s.filterWrap}>
        {/* Search */}
        <View style={s.searchRow}>
          <Feather name="search" size={15} color="#9ca3af" />
          <TextInput
            style={s.searchInput}
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Search listings…"
            returnKeyType="search"
            autoCorrect={false}
            placeholderTextColor="#9ca3af"
          />
          {searchInput.length > 0 && (
            <TouchableOpacity onPress={() => setSearchInput("")} hitSlop={8}>
              <Feather name="x" size={14} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        {/* Status tabs */}
        <View style={s.tabs}>
          {STATUS_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[s.tab, status === tab.key && s.tabActive]}
              onPress={() => handleStatusChange(tab.key)}
            >
              <Text style={[s.tabText, status === tab.key && s.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Meta row */}
        <View style={s.metaRow}>
          <Text style={s.metaCount}>
            {isFetching && !isLoading ? "Refreshing…" : `${total} listing${total !== 1 ? "s" : ""}`}
          </Text>
          <View style={s.metaRight}>
            <TouchableOpacity
              style={s.showImportedToggle}
              onPress={() => { setShowImported((v) => !v); setPage(1); }}
              hitSlop={8}
            >
              <View style={[s.toggleBox, showImported && s.toggleBoxOn]}>
                {showImported && <Feather name="check" size={10} color="#fff" />}
              </View>
              <Text style={s.toggleLabel}>Show imported</Text>
            </TouchableOpacity>
            {importableItems.length > 0 && (
              <TouchableOpacity onPress={toggleAll} hitSlop={8}>
                <Text style={s.selectAllText}>{allSelected ? "Deselect all" : "Select all"}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* List */}
      {error ? (
        <View style={s.centered}>
          <Feather name="alert-circle" size={40} color="#fca5a5" />
          <Text style={s.errorTitle}>Couldn't load listings</Text>
          <Text style={s.errorMsg}>
            {(error as Error).message ?? "Make sure your eBay account is connected."}
          </Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => refetch()}>
            <Text style={s.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : isLoading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color="#ea580c" />
          <Text style={s.loadingText}>Fetching your eBay listings…</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.ebayItemId}
          renderItem={renderItem}
          contentContainerStyle={s.listContent}
          ListEmptyComponent={
            <View style={s.centered}>
              <Feather name="inbox" size={40} color="#d1d5db" />
              <Text style={s.emptyTitle}>No listings found</Text>
              <Text style={s.emptyMsg}>
                {search
                  ? `No results for "${search}"`
                  : `No ${status} eBay listings to import`}
              </Text>
            </View>
          }
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={s.pagination}>
                <TouchableOpacity
                  style={[s.pageBtn, page <= 1 && s.pageBtnDisabled]}
                  onPress={() => setPage((p) => p - 1)}
                  disabled={page <= 1}
                >
                  <Feather name="chevron-left" size={16} color={page <= 1 ? "#d1d5db" : "#374151"} />
                  <Text style={[s.pageBtnText, page <= 1 && s.pageBtnTextDisabled]}>Prev</Text>
                </TouchableOpacity>
                <Text style={s.pageLabel}>Page {page} of {totalPages}</Text>
                <TouchableOpacity
                  style={[s.pageBtn, page >= totalPages && s.pageBtnDisabled]}
                  onPress={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages}
                >
                  <Text style={[s.pageBtnText, page >= totalPages && s.pageBtnTextDisabled]}>Next</Text>
                  <Feather name="chevron-right" size={16} color={page >= totalPages ? "#d1d5db" : "#374151"} />
                </TouchableOpacity>
              </View>
            ) : null
          }
          refreshing={isFetching && !isLoading}
          onRefresh={handleRefresh}
        />
      )}

      {/* Sticky import bar */}
      {selected.size > 0 && (
        <View style={s.importBar}>
          <TouchableOpacity
            style={[s.importBtn, importing && s.importBtnDisabled]}
            onPress={handleImport}
            disabled={importing}
          >
            {importing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Feather name="download" size={16} color="#fff" />
            )}
            <Text style={s.importBtnText}>
              {importing
                ? "Importing…"
                : `Import ${selected.size} item${selected.size !== 1 ? "s" : ""}`}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f9fafb" },

  filterWrap: {
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
    gap: 8,
  },
  searchRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#f3f4f6", borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: Platform.OS === "ios" ? 9 : 6,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#111827" },

  tabs: {
    flexDirection: "row", gap: 6,
  },
  tab: {
    flex: 1, alignItems: "center", paddingVertical: 7,
    borderRadius: 8, backgroundColor: "#f3f4f6",
  },
  tabActive: { backgroundColor: "#ea580c" },
  tabText: { fontSize: 13, fontWeight: "600", color: "#6b7280" },
  tabTextActive: { color: "#fff" },

  metaRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingTop: 2,
  },
  metaCount: { fontSize: 12, color: "#9ca3af" },
  metaRight: { flexDirection: "row", alignItems: "center", gap: 14 },
  showImportedToggle: { flexDirection: "row", alignItems: "center", gap: 6 },
  toggleBox: {
    width: 16, height: 16, borderRadius: 4,
    borderWidth: 1.5, borderColor: "#d1d5db",
    alignItems: "center", justifyContent: "center",
  },
  toggleBoxOn: { backgroundColor: "#ea580c", borderColor: "#ea580c" },
  toggleLabel: { fontSize: 12, color: "#6b7280" },
  selectAllText: { fontSize: 12, fontWeight: "600", color: "#ea580c" },

  listContent: { padding: 12, paddingBottom: 100, gap: 8 },

  row: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#fff", borderRadius: 12,
    borderWidth: 1.5, borderColor: "#e5e7eb",
    padding: 10,
  },
  rowImported: { opacity: 0.5 },
  rowSelected: { borderColor: "#ea580c", backgroundColor: "#fff7ed" },

  checkbox: {
    width: 20, height: 20, borderRadius: 6,
    borderWidth: 1.5, borderColor: "#d1d5db",
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  checkboxSelected: { backgroundColor: "#ea580c", borderColor: "#ea580c" },
  checkboxImported: { backgroundColor: "#f3f4f6", borderColor: "#e5e7eb" },

  thumb: { width: 52, height: 52, borderRadius: 8, flexShrink: 0 },
  thumbEmpty: { backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },

  info: { flex: 1, gap: 3 },
  itemTitle: { fontSize: 13, fontWeight: "500", color: "#111827", lineHeight: 18 },
  itemMeta: { fontSize: 11, color: "#9ca3af" },

  right: { alignItems: "flex-end", gap: 4, flexShrink: 0 },
  price: { fontSize: 13, fontWeight: "700", color: "#111827" },
  badge: { borderRadius: 99, paddingHorizontal: 7, paddingVertical: 2 },
  badgeActive: { backgroundColor: "#dcfce7" },
  badgeDefault: { backgroundColor: "#f3f4f6" },
  badgeImported: { backgroundColor: "#f3f4f6" },
  badgeText: { fontSize: 10, fontWeight: "600" },
  badgeTextActive: { color: "#15803d" },
  badgeTextDefault: { color: "#6b7280" },
  badgeTextImported: { color: "#9ca3af" },

  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  errorTitle: { fontSize: 17, fontWeight: "700", color: "#111827" },
  errorMsg: { fontSize: 14, color: "#6b7280", textAlign: "center", lineHeight: 20 },
  retryBtn: {
    marginTop: 4, backgroundColor: "#ea580c",
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10,
  },
  retryBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  loadingText: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: "#374151" },
  emptyMsg: { fontSize: 14, color: "#9ca3af", textAlign: "center" },

  pagination: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 16, paddingHorizontal: 8,
  },
  pageBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 8, borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#fff",
  },
  pageBtnDisabled: { borderColor: "#f3f4f6", backgroundColor: "#f9fafb" },
  pageBtnText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  pageBtnTextDisabled: { color: "#d1d5db" },
  pageLabel: { fontSize: 13, color: "#6b7280" },

  importBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "#fff",
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#e5e7eb",
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: Platform.OS === "ios" ? 28 : 16,
  },
  importBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: "#ea580c",
    paddingVertical: 15, borderRadius: 14,
  },
  importBtnDisabled: { opacity: 0.6 },
  importBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
