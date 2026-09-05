import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { api } from "../../src/lib/api";
import { BrandHeader } from "../../src/components/BrandHeader";
import { formatCurrency, formatRelativeDate, getMarketplaceLabel } from "@repo/utils";
import type { DashboardStats, SubscriptionInfo } from "@repo/types";

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const { data: statsData, isRefetching, refetch } = useQuery({
    queryKey: ["mobile-dashboard"],
    queryFn: api.getDashboardStats,
    refetchInterval: 60_000,
  });

  const { data: subData } = useQuery({
    queryKey: ["mobile-subscription"],
    queryFn: api.getSubscription,
    staleTime: 5 * 60 * 1000,
  });

  const stats: DashboardStats | undefined = statsData?.data;
  const subscription: SubscriptionInfo | undefined = subData?.data;

  const isActive = subscription?.isActive ?? false;
  const totalCredits = subscription
    ? subscription.aiCredits + subscription.bonusAiCredits
    : 0;
  const creditPct =
    isActive && subscription?.monthlyAiCredits
      ? Math.max(0, Math.min(1, subscription.aiCredits / subscription.monthlyAiCredits))
      : 0;

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      {/* ── Brand header (sidebar equivalent) ─────────────────────────── */}
      <BrandHeader />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#ea580c"
            colors={["#ea580c"]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero banner ──────────────────────────────────────────────── */}
        <View style={s.hero}>
          {/* Decorative rings */}
          <View style={s.heroRing1} />
          <View style={s.heroRing2} />

          <View style={s.heroTop}>
            <Text style={s.heroEyebrow}>Control Center</Text>
            <Text style={s.heroTitle}>Reselling Dashboard</Text>
            <Text style={s.heroSubtitle}>
              Track inventory, listings, revenue, and sync health.
            </Text>
          </View>

          <View style={s.heroGrid}>
            <HeroMiniStat label="Inventory" value={stats?.totalInventory ?? 0} />
            <HeroMiniStat label="Live" value={stats?.activeListings ?? 0} />
            <HeroMiniStat label="Sold" value={stats?.soldThisMonth ?? 0} />
            <HeroMiniStat
              label="Revenue"
              value={formatCurrency(stats?.totalRevenue ?? 0)}
            />
          </View>
        </View>

        {/* ── Credits widget (sidebar credits equivalent) ──────────────── */}
        {subscription ? (
          <View style={s.creditsCard}>
            <View style={s.creditsRow}>
              <View style={s.creditsLeft}>
                <View style={s.creditsIconWrap}>
                  <Feather name="zap" size={12} color="#ea580c" />
                </View>
                <Text style={s.creditsPlan}>
                  {subscription.isTrialing
                    ? "Free Trial"
                    : subscription.plan
                      ? `${subscription.plan} Plan`
                      : "No Plan"}
                </Text>
              </View>

              {isActive ? (
                <Text style={s.creditsCount}>
                  <Text style={s.creditsNum}>{totalCredits}</Text>
                  <Text style={s.creditsMax}> / {subscription.monthlyAiCredits}</Text>
                </Text>
              ) : (
                <Text style={s.upgradeText}>Start trial →</Text>
              )}
            </View>

            {isActive && (
              <View style={s.progressBg}>
                <View style={[s.progressFill, { width: `${creditPct * 100}%` as any }]} />
              </View>
            )}

            <Text style={s.creditsHint}>
              {!isActive
                ? "Start your free trial to unlock crossposting & AI tools"
                : totalCredits === 0
                  ? "No AI credits left — buy a top-up to keep using AI tools"
                  : "Smart AI credits — BG removal costs 1, other tools cost 10"}
            </Text>
          </View>
        ) : null}

        {/* ── Stat cards ───────────────────────────────────────────────── */}
        <View style={s.statsGrid}>
          <StatCard
            label="Total Inventory"
            value={String(stats?.totalInventory ?? 0)}
            icon="package"
            accent="#c2410c"
          />
          <StatCard
            label="Active Listings"
            value={String(stats?.activeListings ?? 0)}
            icon="tag"
            accent="#b45309"
          />
          <StatCard
            label="Sold This Month"
            value={String(stats?.soldThisMonth ?? 0)}
            icon="trending-up"
            accent="#c2410c"
          />
          <StatCard
            label="Total Revenue"
            value={formatCurrency(stats?.totalRevenue ?? 0)}
            icon="dollar-sign"
            accent="#b45309"
          />
        </View>

        {/* ── Listings by marketplace ───────────────────────────────────── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Feather name="bar-chart-2" size={15} color="#c2410c" />
            <Text style={s.sectionTitle}>Listings by Marketplace</Text>
          </View>

          {!stats?.listingsByMarketplace?.length ? (
            <Text style={s.empty}>No listings yet</Text>
          ) : (
            stats.listingsByMarketplace.map((mp) => {
              const pct = Math.max(
                4,
                Math.min(100, Math.round((mp.active / Math.max(mp.count, 1)) * 100))
              );
              return (
                <View key={mp.marketplace} style={s.mpRow}>
                  <View style={s.mpInfo}>
                    <Text style={s.mpName}>
                      {getMarketplaceLabel(mp.marketplace as any)}
                    </Text>
                    <Text style={s.mpSub}>
                      {mp.active} active · {mp.count} total
                    </Text>
                  </View>
                  <View style={s.mpProgressBg}>
                    <View style={[s.mpProgressFill, { width: `${pct}%` as any }]} />
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* ── Recent sync activity ─────────────────────────────────────── */}
        <View style={[s.section, s.lastSection]}>
          <View style={s.sectionHeader}>
            <Feather name="refresh-cw" size={15} color="#c2410c" />
            <Text style={s.sectionTitle}>Recent Sync Activity</Text>
          </View>

          {!stats?.recentSyncEvents?.length ? (
            <Text style={s.empty}>No sync activity yet</Text>
          ) : (
            stats.recentSyncEvents.map((event) => (
              <View key={event.id} style={s.eventRow}>
                <View style={s.eventInfo}>
                  <Text style={s.eventTitle} numberOfLines={1}>
                    {event.listingTitle}
                  </Text>
                  <Text style={s.eventMeta}>
                    {getMarketplaceLabel(event.marketplace)} · {event.type}
                  </Text>
                </View>
                <View style={s.eventRight}>
                  <View
                    style={[
                      s.badge,
                      event.status === "success" && s.badgeSuccess,
                      event.status === "failed" && s.badgeFailed,
                    ]}
                  >
                    <Text
                      style={[
                        s.badgeText,
                        event.status === "success" && s.badgeTextSuccess,
                        event.status === "failed" && s.badgeTextFailed,
                      ]}
                    >
                      {event.status}
                    </Text>
                  </View>
                  <Text style={s.eventTime}>
                    {formatRelativeDate(event.createdAt)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function HeroMiniStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <View style={s.miniStat}>
      <Text style={s.miniStatLabel}>{label}</Text>
      <Text style={s.miniStatValue}>{value}</Text>
    </View>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: string;
  accent: string;
}) {
  return (
    <View style={s.statCard}>
      <View style={[s.statIconWrap, { backgroundColor: accent + "18" }]}>
        <Feather name={icon as any} size={18} color={accent} />
      </View>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#f6f5f3",
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },

  // Hero banner
  hero: {
    borderRadius: 20,
    backgroundColor: "#9a3412",
    padding: 18,
    overflow: "hidden",
    gap: 14,
    shadowColor: "#ea580c",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  heroRing1: {
    position: "absolute",
    top: -20,
    right: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  heroRing2: {
    position: "absolute",
    bottom: 8,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(251,191,36,0.15)",
  },
  heroTop: {
    gap: 4,
  },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: "#fed7aa",
    textTransform: "uppercase",
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 13,
    color: "#fed7aa",
    lineHeight: 18,
  },
  heroGrid: {
    flexDirection: "row",
    gap: 8,
  },
  miniStat: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  miniStatLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: "#fed7aa",
    textTransform: "uppercase",
  },
  miniStatValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
    marginTop: 2,
  },

  // Credits card
  creditsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e4e4e7",
    padding: 14,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  creditsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  creditsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  creditsIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: "#fff7ed",
    alignItems: "center",
    justifyContent: "center",
  },
  creditsPlan: {
    fontSize: 13,
    fontWeight: "600",
    color: "#18181b",
  },
  creditsCount: {
    fontSize: 13,
  },
  creditsNum: {
    fontWeight: "700",
    color: "#09090b",
    fontSize: 16,
  },
  creditsMax: {
    color: "#a1a1aa",
    fontWeight: "400",
  },
  upgradeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#ea580c",
  },
  progressBg: {
    height: 6,
    borderRadius: 99,
    backgroundColor: "#f4f4f5",
    overflow: "hidden",
  },
  progressFill: {
    height: 6,
    borderRadius: 99,
    backgroundColor: "#ea580c",
  },
  creditsHint: {
    fontSize: 11,
    color: "#a1a1aa",
  },

  // Stat cards
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e4e4e7",
    padding: 14,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
    color: "#09090b",
    letterSpacing: -0.5,
    marginTop: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#71717a",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Section card
  section: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e4e4e7",
    padding: 14,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  lastSection: {
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#f4f4f5",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#18181b",
  },
  empty: {
    fontSize: 13,
    color: "#a1a1aa",
  },

  // Marketplace rows
  mpRow: {
    gap: 6,
  },
  mpInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mpName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#18181b",
  },
  mpSub: {
    fontSize: 11,
    color: "#71717a",
  },
  mpProgressBg: {
    height: 6,
    borderRadius: 99,
    backgroundColor: "#f4f4f5",
    overflow: "hidden",
  },
  mpProgressFill: {
    height: 6,
    borderRadius: 99,
    backgroundColor: "#ea580c",
  },

  // Sync event rows
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  eventInfo: {
    flex: 1,
    gap: 2,
  },
  eventTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#18181b",
  },
  eventMeta: {
    fontSize: 11,
    color: "#71717a",
  },
  eventRight: {
    alignItems: "flex-end",
    gap: 3,
  },
  eventTime: {
    fontSize: 10,
    color: "#a1a1aa",
  },
  badge: {
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: "#f4f4f5",
  },
  badgeSuccess: {
    backgroundColor: "#dcfce7",
  },
  badgeFailed: {
    backgroundColor: "#fee2e2",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#52525b",
  },
  badgeTextSuccess: {
    color: "#166534",
  },
  badgeTextFailed: {
    color: "#991b1b",
  },
});
