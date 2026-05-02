import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { BrandHeader } from "../../src/components/BrandHeader";
import { api } from "../../src/lib/api";

interface MarketplaceMeta {
  key: string;
  label: string;
  color: string;
  textColor: string;
  icon: string;
  available: boolean;
}

const MARKETPLACES: MarketplaceMeta[] = [
  { key: "EBAY", label: "eBay", color: "#3b82f6", textColor: "#fff", icon: "shopping-bag", available: true },
  { key: "MERCARI", label: "Mercari", color: "#ef4444", textColor: "#fff", icon: "tag", available: true },
  { key: "POSHMARK", label: "Poshmark", color: "#e11d48", textColor: "#fff", icon: "heart", available: false },
  { key: "DEPOP", label: "Depop", color: "#18181b", textColor: "#fff", icon: "camera", available: false },
  { key: "ETSY", label: "Etsy", color: "#f97316", textColor: "#fff", icon: "scissors", available: false },
  { key: "FACEBOOK_MARKETPLACE", label: "Facebook", color: "#1d4ed8", textColor: "#fff", icon: "facebook", available: false },
];

export default function MarketplacesScreen() {
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["marketplace-connections"],
    queryFn: api.getMarketplaceConnections,
  });

  const disconnectMutation = useMutation({
    mutationFn: (id: string) => api.deleteMarketplaceConnection(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["marketplace-connections"] }),
  });

  const connections: any[] = data?.data ?? [];

  function getConnection(key: string) {
    return connections.find((c) => c.marketplace === key) ?? null;
  }

  function handleConnect(mp: MarketplaceMeta) {
    if (mp.key === "MERCARI") {
      router.push("/mercari-login");
      return;
    }
    // eBay and other OAuth marketplaces — not yet supported natively on mobile
    Alert.alert(
      "Connect on Desktop",
      `Connect ${mp.label} from the web dashboard to get started.`
    );
  }

  function handleDisconnect(mp: MarketplaceMeta, connection: any) {
    Alert.alert(
      `Disconnect ${mp.label}`,
      `Remove ${connection.accountName ?? mp.label} from your account?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: () => disconnectMutation.mutate(connection.id),
        },
      ]
    );
  }

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <BrandHeader />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.headerRow}>
          <Text style={s.heading}>Marketplaces</Text>
          {!isLoading && (
            <View style={s.badge}>
              <Text style={s.badgeText}>{connections.length} connected</Text>
            </View>
          )}
        </View>
        <Text style={s.sub}>Connect your accounts to start cross-listing.</Text>

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color="#ea580c" />
        ) : (
          <View style={s.list}>
            {MARKETPLACES.map((mp) => {
              const connection = getConnection(mp.key);
              const isConnected = !!connection;
              return (
                <View key={mp.key} style={[s.card, isConnected && s.cardConnected]}>
                  <View style={[s.iconBox, { backgroundColor: mp.color + "18" }]}>
                    <Feather name={mp.icon as any} size={20} color={mp.color} />
                  </View>

                  <View style={s.cardBody}>
                    <View style={s.cardTop}>
                      <Text style={s.mpName}>{mp.label}</Text>
                      {isConnected ? (
                        <View style={s.connectedBadge}>
                          <View style={s.dot} />
                          <Text style={s.connectedText}>Connected</Text>
                        </View>
                      ) : mp.available ? (
                        <View style={s.availableBadge}>
                          <Text style={s.availableText}>Available</Text>
                        </View>
                      ) : (
                        <View style={s.soonBadge}>
                          <Text style={s.soonText}>Soon</Text>
                        </View>
                      )}
                    </View>

                    {isConnected && connection.accountName ? (
                      <Text style={s.accountName} numberOfLines={1}>
                        {connection.accountName}
                      </Text>
                    ) : null}

                    <View style={s.cardActions}>
                      {isConnected ? (
                        <TouchableOpacity
                          style={s.disconnectBtn}
                          onPress={() => handleDisconnect(mp, connection)}
                          disabled={disconnectMutation.isPending}
                        >
                          <Feather name="x" size={13} color="#71717a" />
                          <Text style={s.disconnectText}>Disconnect</Text>
                        </TouchableOpacity>
                      ) : mp.available ? (
                        <TouchableOpacity
                          style={[s.connectBtn, { backgroundColor: mp.color }]}
                          onPress={() => handleConnect(mp)}
                        >
                          <Text style={[s.connectText, { color: mp.textColor }]}>Connect</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity style={s.soonBtn} disabled>
                          <Text style={s.soonBtnText}>Coming soon</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f6f5f3" },
  scroll: { padding: 16, paddingBottom: 32 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  heading: { fontSize: 22, fontWeight: "700", color: "#09090b" },
  badge: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 99,
  },
  badgeText: { fontSize: 12, fontWeight: "600", color: "#16a34a" },
  sub: { fontSize: 14, color: "#71717a", marginBottom: 20 },
  list: { gap: 12 },
  card: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e4e4e7",
  },
  cardConnected: { borderColor: "#bbf7d0" },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardBody: { flex: 1, gap: 4 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  mpName: { fontSize: 15, fontWeight: "600", color: "#09090b" },
  connectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  dot: { width: 6, height: 6, borderRadius: 99, backgroundColor: "#22c55e" },
  connectedText: { fontSize: 11, fontWeight: "600", color: "#16a34a" },
  availableBadge: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  availableText: { fontSize: 11, fontWeight: "600", color: "#2563eb" },
  soonBadge: {
    backgroundColor: "#f4f4f5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  soonText: { fontSize: 11, color: "#71717a" },
  accountName: { fontSize: 13, color: "#52525b" },
  cardActions: { marginTop: 8 },
  connectBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 10,
  },
  connectText: { fontSize: 13, fontWeight: "600" },
  disconnectBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e4e4e7",
  },
  disconnectText: { fontSize: 13, color: "#71717a" },
  soonBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e4e4e7",
    borderStyle: "dashed",
  },
  soonBtnText: { fontSize: 13, color: "#a1a1aa" },
});
