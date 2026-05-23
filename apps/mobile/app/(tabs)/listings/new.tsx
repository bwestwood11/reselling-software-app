import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { useEffect, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { api } from "../../../src/lib/api";
import { formatCurrency, getMarketplaceLabel } from "@repo/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Aspect {
  name: string;
  required: boolean;
  suggestedValues: string[];
}

interface SelectedCategory {
  categoryId: string;
  categoryName: string;
  breadcrumb: string;
}

interface MercariCat {
  id: string;
  label: string;
  isLeaf: boolean;
  hasChildren: boolean;
  fullPath: string[];
  isSizeRequired: boolean;
  sizeSchemaId: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EBAY_CONDITIONS = [
  { id: "1000", label: "New with tags" },
  { id: "1500", label: "New without tags" },
  { id: "2000", label: "New with defects" },
  { id: "2500", label: "New other" },
  { id: "3000", label: "Pre-owned" },
];

const CONDITION_TO_EBAY: Record<string, string> = {
  NEW_WITH_TAGS: "1000",
  NEW_WITHOUT_TAGS: "1500",
  VERY_GOOD: "3000",
  GOOD: "3000",
  SATISFACTORY: "3000",
};

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepBar({ step, total }: { step: number; total: number }) {
  return (
    <View style={s.stepBar}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[s.stepDot, i <= step - 1 && s.stepDotActive]}
        />
      ))}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function NewListingScreen() {
  const router = useRouter();
  const { inventoryItemId: paramItemId } = useLocalSearchParams<{
    inventoryItemId?: string;
  }>();

  const [step, setStep] = useState(1);

  // Step 1
  const [selectedItemId, setSelectedItemId] = useState(paramItemId ?? "");
  const [selectedConnectionIds, setSelectedConnectionIds] = useState<string[]>([]);

  // Step 2
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [ebayConditionId, setEbayConditionId] = useState("3000");
  const [selectedMercariCat, setSelectedMercariCat] = useState<MercariCat | null>(null);
  const [mercariZipCode, setMercariZipCode] = useState("");
  const [mercariShipMethod, setMercariShipMethod] = useState<"SOYO" | "PREPAID">("SOYO");
  const [mercariShippingPayerId, setMercariShippingPayerId] = useState<1 | 2>(1);
  const [mercariWeightLb, setMercariWeightLb] = useState("");
  const [mercariWeightOz, setMercariWeightOz] = useState("");
  const [mercariDimL, setMercariDimL] = useState("");
  const [mercariDimW, setMercariDimW] = useState("");
  const [mercariDimH, setMercariDimH] = useState("");
  const [mercariSelectedCarrier, setMercariSelectedCarrier] = useState<any | null>(null);

  // Step 3 – category
  const [categoryQuery, setCategoryQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<SelectedCategory | null>(null);
  const [showCategoryResults, setShowCategoryResults] = useState(false);

  // Step 3 – aspects (driven by React Query, not manual state)
  const [specificValues, setSpecificValues] = useState<Record<string, string>>({});
  const [customMode, setCustomMode] = useState<Set<string>>(new Set());
  const [extraSpecifics, setExtraSpecifics] = useState<{ name: string; value: string }[]>([]);

  // Step 3 – policies
  const [fulfillmentPolicyId, setFulfillmentPolicyId] = useState("");
  const [paymentPolicyId, setPaymentPolicyId] = useState("");
  const [returnPolicyId, setReturnPolicyId] = useState("");

  const [submitting, setSubmitting] = useState(false);

  // ── Data ──────────────────────────────────────────────────────────────────

  const { data: inventoryData } = useQuery({
    queryKey: ["mobile-inventory"],
    queryFn: () => api.getInventory({ limit: "100" }),
  });
  const inventoryItems: any[] = inventoryData?.data ?? [];

  const { data: itemData } = useQuery({
    queryKey: ["mobile-inventory-item", selectedItemId],
    queryFn: () => api.getInventoryItem(selectedItemId),
    enabled: !!selectedItemId,
    select: (d: any) => d.data,
  });

  const { data: connectionsData } = useQuery({
    queryKey: ["mobile-marketplace-connections"],
    queryFn: () => api.getMarketplaceConnections(),
    select: (d: any) => d.data ?? [],
  });
  const connections: any[] = connectionsData ?? [];

  const selectedConnections = connections.filter((c) => selectedConnectionIds.includes(c.id));
  const hasEbay = selectedConnections.some((c) => c.marketplace === "EBAY");
  const hasMercari = selectedConnections.some((c) => c.marketplace === "MERCARI");
  const totalSteps = hasEbay ? 3 : 2;

  function toggleConnection(id: string) {
    setSelectedConnectionIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  // Pre-populate from inventory item
  useEffect(() => {
    if (!itemData) return;
    if (!title) setTitle(itemData.title ?? "");
    if (!description) setDescription(itemData.description ?? "");
    if (!price && itemData.targetPrice != null) {
      setPrice(String(Number(itemData.targetPrice)));
    }
    if (itemData.condition) {
      setEbayConditionId(CONDITION_TO_EBAY[itemData.condition] ?? "3000");
    }
    // Seed Brand from item into specificValues
    if (itemData.brand) {
      setSpecificValues((prev) => ({ ...prev, Brand: itemData.brand }));
    }
  }, [itemData]);

  // eBay policies
  const { data: policiesData, isLoading: policiesLoading } = useQuery({
    queryKey: ["mobile-ebay-policies"],
    queryFn: () => api.getEbayPolicies(),
    enabled: hasEbay,
    select: (d: any) => d.data,
  });
  const fulfillmentPolicies: any[] = policiesData?.fulfillmentPolicies ?? [];
  const paymentPolicies: any[] = policiesData?.paymentPolicies ?? [];
  const returnPolicies: any[] = policiesData?.returnPolicies ?? [];

  // eBay category aspects — reactive: re-fetches automatically when selectedCategory changes
  const {
    data: aspects = [],
    isLoading: aspectsLoading,
    error: aspectsQueryError,
  } = useQuery({
    queryKey: ["ebay-aspects", selectedCategory?.categoryId ?? ""],
    queryFn: async () => {
      if (!selectedCategory?.categoryId) return [] as Aspect[];
      const res = await api.getEbayCategoryAspects(selectedCategory.categoryId);
      return (res?.data ?? []) as Aspect[];
    },
    enabled: !!selectedCategory?.categoryId && hasEbay,
    staleTime: 5 * 60 * 1000,
  });
  const aspectsError: string | null = aspectsQueryError
    ? (aspectsQueryError as Error).message ?? "Failed to load item specifics"
    : null;

  // Debounce category search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(categoryQuery), 400);
    return () => clearTimeout(t);
  }, [categoryQuery]);

  const { data: categoryResults, isFetching: categorySearching } = useQuery({
    queryKey: ["ebay-categories", debouncedQuery],
    queryFn: () => api.getEbayCategorySuggestions(debouncedQuery),
    enabled: hasEbay && debouncedQuery.length > 1,
    select: (d: any) => d.data ?? [],
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleSelectCategory(cat: any) {
    setSelectedCategory({
      categoryId: cat.categoryId,
      categoryName: cat.categoryName,
      breadcrumb: cat.breadcrumb ?? cat.categoryName,
    });
    setCategoryQuery("");
    setShowCategoryResults(false);
    setSpecificValues({});
    setCustomMode(new Set());
    setExtraSpecifics([]);
  }

  // Pre-fill Brand once aspects load for the newly selected category
  useEffect(() => {
    if (aspects.length === 0 || !itemData?.brand) return;
    const brandAspect = aspects.find((a) => a.name.toLowerCase() === "brand");
    if (brandAspect) {
      setSpecificValues((prev) => (prev["Brand"] ? prev : { ...prev, Brand: itemData.brand }));
    }
  }, [aspects, itemData]);

  function setAspectValue(name: string, value: string) {
    setSpecificValues((prev) => ({ ...prev, [name]: value }));
  }

  function toggleCustomMode(name: string, on: boolean) {
    setCustomMode((prev) => {
      const next = new Set(prev);
      on ? next.add(name) : next.delete(name);
      return next;
    });
    if (!on) {
      setSpecificValues((prev) => ({ ...prev, [name]: "" }));
    }
  }

  function buildItemSpecifics(): Record<string, string> | undefined {
    const obj: Record<string, string> = {};
    for (const [k, v] of Object.entries(specificValues)) {
      if (v.trim()) obj[k] = v.trim();
    }
    for (const { name, value } of extraSpecifics) {
      if (name.trim() && value.trim()) obj[name.trim()] = value.trim();
    }
    return Object.keys(obj).length > 0 ? obj : undefined;
  }

  // ── Validation ────────────────────────────────────────────────────────────

  function validate1() {
    if (!selectedItemId) { Alert.alert("Select an item"); return false; }
    if (selectedConnectionIds.length === 0) { Alert.alert("Select at least one marketplace"); return false; }
    return true;
  }

  function validate2() {
    if (!title.trim()) { Alert.alert("Title required"); return false; }
    if (!price || Number(price) <= 0) { Alert.alert("Valid price required"); return false; }
    if (hasMercari && !selectedMercariCat) {
      Alert.alert("Mercari category required", "Select a Mercari category.");
      return false;
    }
    if (hasMercari && !mercariZipCode.trim()) {
      Alert.alert("Zip code required", "Enter your zip code for Mercari shipping.");
      return false;
    }
    return true;
  }

  function validate3() {
    if (!selectedCategory) { Alert.alert("Category required", "Search and select an eBay category."); return false; }
    if (!fulfillmentPolicyId) { Alert.alert("Select a fulfillment policy"); return false; }
    if (!paymentPolicyId) { Alert.alert("Select a payment policy"); return false; }
    if (!returnPolicyId) { Alert.alert("Select a return policy"); return false; }
    const missing = aspects
      .filter((a) => a.required && !specificValues[a.name]?.trim())
      .map((a) => a.name);
    if (missing.length > 0) {
      Alert.alert(
        "Required item specifics missing",
        missing.join(", ")
      );
      return false;
    }
    return true;
  }

  function nextStep() {
    if (step === 1 && !validate1()) return;
    if (step === 2 && !validate2()) return;
    setStep((s) => s + 1);
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function submit(andPublish: boolean) {
    if (step === 2 && !validate2()) return;
    if (step === 3 && !validate3()) return;

    const marketplaces = selectedConnectionIds.map((connId) => {
      const conn = connections.find((c) => c.id === connId);
      const mp: Record<string, unknown> = { connectionId: connId };
      if (conn?.marketplace === "EBAY") {
        mp.marketplaceData = {
          categoryId: selectedCategory?.categoryId,
          conditionId: parseInt(ebayConditionId, 10),
          listingPolicies: { fulfillmentPolicyId, paymentPolicyId, returnPolicyId },
          itemSpecifics: buildItemSpecifics(),
        };
      }
      if (conn?.marketplace === "MERCARI" && selectedMercariCat) {
        const totalWeightOz =
          (parseFloat(mercariWeightLb) || 0) * 16 + (parseFloat(mercariWeightOz) || 0);
        const dimL = parseFloat(mercariDimL) || 0;
        const dimW = parseFloat(mercariDimW) || 0;
        const dimH = parseFloat(mercariDimH) || 0;
        const hasDims = dimL > 0 && dimW > 0 && dimH > 0;
        mp.marketplaceData = {
          categoryId: selectedMercariCat.id,
          categoryPath: selectedMercariCat.fullPath,
          ...(mercariZipCode.trim() ? { zipCode: mercariZipCode.trim() } : {}),
          shipping: {
            method: mercariShipMethod,
            ...(mercariShipMethod === "PREPAID" && totalWeightOz > 0
              ? {
                  weightOz: Math.round(totalWeightOz),
                  ...(hasDims ? { dimension: { length: dimL, width: dimW, height: dimH } } : {}),
                  ...(mercariSelectedCarrier?.id
                    ? { shippingClassId: parseInt(String(mercariSelectedCarrier.id), 10) }
                    : {}),
                  shippingPayerId: mercariShippingPayerId,
                  ...(typeof mercariSelectedCarrier?.fee === "number"
                    ? { shippingCost: mercariSelectedCarrier.fee }
                    : {}),
                }
              : {}),
          },
        };
      }
      return mp;
    });

    const body = {
      inventoryItemId: selectedItemId,
      price: Number(price),
      title: title.trim(),
      description: description.trim() || undefined,
      publishImmediately: andPublish,
      marketplaces,
    };

    setSubmitting(true);
    try {
      const res = await api.crosslistListings(body);
      const results: Array<{ marketplace: string; listingId?: string; status: string; error?: string }> =
        res.data ?? [];

      if (andPublish) {
        const active = results.filter((r) => r.status === "ACTIVE").length;
        const failed = results.filter((r) => r.status === "error");
        const needsWebView = results.find((r) => r.status === "NEEDS_WEBVIEW");

        if (needsWebView?.listingId) {
          // Navigate to the Mercari WebView publisher; it handles its own success/error UI
          router.replace(
            `/mercari-publish?listingId=${needsWebView.listingId}&otherPublished=${active}`
          );
          return;
        }

        let msg = `Published to ${active} marketplace(s).`;
        if (failed.length > 0) {
          msg += `\n\n${failed.length} failed: ${failed.map((r) => r.marketplace).join(", ")}`;
        }

        Alert.alert("Published!", msg, [{ text: "OK", onPress: () => router.back() }]);
      } else {
        router.back();
      }
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={s.container}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
      >
        <StepBar step={step} total={totalSteps} />

        {step === 1 && (
          <Step1
            inventoryItems={inventoryItems}
            selectedItemId={selectedItemId}
            onSelectItem={setSelectedItemId}
            connections={connections}
            selectedConnectionIds={selectedConnectionIds}
            onToggleConnection={toggleConnection}
          />
        )}

        {step === 2 && (
          <Step2
            title={title}
            onChangeTitle={setTitle}
            price={price}
            onChangePrice={setPrice}
            description={description}
            onChangeDescription={setDescription}
            isEbay={hasEbay}
            ebayConditionId={ebayConditionId}
            onChangeEbayCondition={setEbayConditionId}
            isMercari={hasMercari}
            selectedMercariCat={selectedMercariCat}
            onSelectMercariCat={setSelectedMercariCat}
            mercariZipCode={mercariZipCode}
            onChangeMercariZipCode={setMercariZipCode}
            mercariShipMethod={mercariShipMethod}
            onChangeShipMethod={(m) => {
              setMercariShipMethod(m);
              setMercariSelectedCarrier(null);
            }}
            mercariShippingPayerId={mercariShippingPayerId}
            onChangeShippingPayerId={setMercariShippingPayerId}
            mercariWeightLb={mercariWeightLb}
            onChangeWeightLb={setMercariWeightLb}
            mercariWeightOz={mercariWeightOz}
            onChangeWeightOz={setMercariWeightOz}
            mercariDimL={mercariDimL}
            onChangeDimL={setMercariDimL}
            mercariDimW={mercariDimW}
            onChangeDimW={setMercariDimW}
            mercariDimH={mercariDimH}
            onChangeDimH={setMercariDimH}
            mercariSelectedCarrier={mercariSelectedCarrier}
            onSelectCarrier={setMercariSelectedCarrier}
          />
        )}

        {step === 3 && hasEbay && (
          <Step3Ebay
            // Category
            categoryQuery={categoryQuery}
            onChangeCategoryQuery={(q) => {
              setCategoryQuery(q);
              setShowCategoryResults(q.length > 0);
            }}
            categorySearching={categorySearching}
            categoryResults={showCategoryResults ? (categoryResults ?? []) : []}
            selectedCategory={selectedCategory}
            onSelectCategory={handleSelectCategory}
            onClearCategory={() => {
              setSelectedCategory(null);
              setSpecificValues({});
              setCustomMode(new Set());
              setExtraSpecifics([]);
            }}
            // Aspects
            aspects={aspects}
            aspectsLoading={aspectsLoading}
            aspectsError={aspectsError}
            specificValues={specificValues}
            customMode={customMode}
            onSetAspectValue={setAspectValue}
            onToggleCustomMode={toggleCustomMode}
            extraSpecifics={extraSpecifics}
            onChangeExtraSpecifics={setExtraSpecifics}
            // Policies
            fulfillmentPolicies={fulfillmentPolicies}
            fulfillmentPolicyId={fulfillmentPolicyId}
            onSelectFulfillment={setFulfillmentPolicyId}
            paymentPolicies={paymentPolicies}
            paymentPolicyId={paymentPolicyId}
            onSelectPayment={setPaymentPolicyId}
            returnPolicies={returnPolicies}
            returnPolicyId={returnPolicyId}
            onSelectReturn={setReturnPolicyId}
            policiesLoading={policiesLoading}
          />
        )}

        {/* Navigation */}
        <View style={s.navRow}>
          {step > 1 && (
            <TouchableOpacity
              style={s.backBtn}
              onPress={() => setStep((n) => n - 1)}
            >
              <Feather name="arrow-left" size={16} color="#6b7280" />
              <Text style={s.backBtnText}>Back</Text>
            </TouchableOpacity>
          )}

          {step < totalSteps ? (
            <TouchableOpacity
              style={[s.nextBtn, step === 1 && { flex: 1 }]}
              onPress={nextStep}
            >
              <Text style={s.nextBtnText}>Continue</Text>
              <Feather name="arrow-right" size={16} color="#fff" />
            </TouchableOpacity>
          ) : (
            <View style={s.submitRow}>
              <TouchableOpacity
                style={[s.draftBtn, submitting && s.btnDisabled]}
                onPress={() => submit(false)}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#ea580c" size="small" />
                ) : (
                  <Text style={s.draftBtnText}>Save Draft</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.publishBtn, submitting && s.btnDisabled]}
                onPress={() => submit(true)}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Feather name="zap" size={15} color="#fff" />
                    <Text style={s.publishBtnText}>
                      {selectedConnectionIds.length > 1
                        ? `Publish to ${selectedConnectionIds.length} Markets`
                        : `Publish to ${getMarketplaceLabel(selectedConnections[0]?.marketplace ?? "")}`}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Step 1: Item + Marketplace ───────────────────────────────────────────────

function Step1({
  inventoryItems, selectedItemId, onSelectItem,
  connections, selectedConnectionIds, onToggleConnection,
}: {
  inventoryItems: any[]; selectedItemId: string; onSelectItem: (id: string) => void;
  connections: any[]; selectedConnectionIds: string[]; onToggleConnection: (id: string) => void;
}) {
  return (
    <View>
      <Text style={s.stepTitle}>Select Item & Marketplaces</Text>

      <Card label="Inventory Item">
        {inventoryItems.length === 0 ? (
          <Text style={s.hint}>No inventory items yet. Add one first.</Text>
        ) : (
          inventoryItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[s.pickRow, item.id === selectedItemId && s.pickRowSelected]}
              onPress={() => onSelectItem(item.id)}
            >
              {item.images?.[0] ? (
                <Image source={{ uri: item.images[0].url }} style={s.pickThumb} />
              ) : (
                <View style={[s.pickThumb, s.pickThumbEmpty]}>
                  <Feather name="image" size={14} color="#9ca3af" />
                </View>
              )}
              <View style={s.pickInfo}>
                <Text style={s.pickTitle} numberOfLines={1}>{item.title}</Text>
                {item.targetPrice != null && (
                  <Text style={s.pickMeta}>{formatCurrency(Number(item.targetPrice))}</Text>
                )}
              </View>
              {item.id === selectedItemId && (
                <Feather name="check-circle" size={18} color="#ea580c" />
              )}
            </TouchableOpacity>
          ))
        )}
      </Card>

      <Card label={`Marketplace Accounts${selectedConnectionIds.length > 0 ? ` · ${selectedConnectionIds.length} selected` : ""}`}>
        {connections.length === 0 ? (
          <Text style={s.hint}>No connected marketplaces. Connect one in the Markets tab.</Text>
        ) : (
          <>
            <Text style={[s.hint, { marginBottom: 10 }]}>
              Tap to select — choose multiple to crosslist.
            </Text>
            {connections.map((conn) => {
              const selected = selectedConnectionIds.includes(conn.id);
              return (
                <TouchableOpacity
                  key={conn.id}
                  style={[s.pickRow, selected && s.pickRowSelected]}
                  onPress={() => onToggleConnection(conn.id)}
                >
                  <Feather
                    name="shopping-bag"
                    size={20}
                    color={selected ? "#ea580c" : "#6b7280"}
                  />
                  <View style={s.pickInfo}>
                    <Text style={s.pickTitle}>{getMarketplaceLabel(conn.marketplace)}</Text>
                    {conn.accountName && (
                      <Text style={s.pickMeta}>{conn.accountName}</Text>
                    )}
                  </View>
                  {selected ? (
                    <Feather name="check-circle" size={18} color="#ea580c" />
                  ) : (
                    <Feather name="circle" size={18} color="#d1d5db" />
                  )}
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </Card>
    </View>
  );
}

// ─── Step 2: Title, price, description ───────────────────────────────────────

function Step2({
  title, onChangeTitle, price, onChangePrice,
  description, onChangeDescription,
  isEbay, ebayConditionId, onChangeEbayCondition,
  isMercari, selectedMercariCat, onSelectMercariCat,
  mercariZipCode, onChangeMercariZipCode,
  mercariShipMethod, onChangeShipMethod,
  mercariShippingPayerId, onChangeShippingPayerId,
  mercariWeightLb, onChangeWeightLb,
  mercariWeightOz, onChangeWeightOz,
  mercariDimL, onChangeDimL,
  mercariDimW, onChangeDimW,
  mercariDimH, onChangeDimH,
  mercariSelectedCarrier, onSelectCarrier,
}: {
  title: string; onChangeTitle: (v: string) => void;
  price: string; onChangePrice: (v: string) => void;
  description: string; onChangeDescription: (v: string) => void;
  isEbay: boolean; ebayConditionId: string; onChangeEbayCondition: (v: string) => void;
  isMercari: boolean;
  selectedMercariCat: MercariCat | null; onSelectMercariCat: (cat: MercariCat | null) => void;
  mercariZipCode: string; onChangeMercariZipCode: (v: string) => void;
  mercariShipMethod: "SOYO" | "PREPAID"; onChangeShipMethod: (m: "SOYO" | "PREPAID") => void;
  mercariShippingPayerId: 1 | 2; onChangeShippingPayerId: (p: 1 | 2) => void;
  mercariWeightLb: string; onChangeWeightLb: (v: string) => void;
  mercariWeightOz: string; onChangeWeightOz: (v: string) => void;
  mercariDimL: string; onChangeDimL: (v: string) => void;
  mercariDimW: string; onChangeDimW: (v: string) => void;
  mercariDimH: string; onChangeDimH: (v: string) => void;
  mercariSelectedCarrier: any | null; onSelectCarrier: (c: any | null) => void;
}) {
  return (
    <View>
      <Text style={s.stepTitle}>Listing Details</Text>

      <Card label="Details">
        <FieldLabel label={`Title${isEbay ? " (max 80)" : ""}`} />
        <TextInput
          style={s.input}
          value={title}
          onChangeText={onChangeTitle}
          placeholder="Listing title"
          maxLength={isEbay ? 80 : 255}
          returnKeyType="next"
        />
        {isEbay && (
          <Text style={s.charCount}>{title.length} / 80</Text>
        )}

        <FieldLabel label="Price ($)" />
        <TextInput
          style={[s.input, { marginBottom: 0 }]}
          value={price}
          onChangeText={onChangePrice}
          placeholder="0.00"
          keyboardType="decimal-pad"
        />

        {isEbay && (
          <>
            <FieldLabel label="Condition" />
            <View style={s.chipRow}>
              {EBAY_CONDITIONS.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[s.chip, ebayConditionId === c.id && s.chipActive]}
                  onPress={() => onChangeEbayCondition(c.id)}
                >
                  <Text style={[s.chipText, ebayConditionId === c.id && s.chipTextActive]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <FieldLabel label="Description" />
        <TextInput
          style={[s.input, s.textarea, { marginBottom: 0 }]}
          value={description}
          onChangeText={onChangeDescription}
          placeholder="Describe the item…"
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />
      </Card>

      {isMercari && (
        <>
          <MercariCategoryPicker
            selected={selectedMercariCat}
            onSelect={onSelectMercariCat}
          />
          <Card label="Zip Code *">
            <TextInput
              style={[s.input, { marginBottom: 0 }]}
              value={mercariZipCode}
              onChangeText={onChangeMercariZipCode}
              placeholder="e.g. 90210"
              keyboardType="number-pad"
              maxLength={10}
            />
          </Card>
          <MercariShippingSection
            categoryId={selectedMercariCat ? parseInt(selectedMercariCat.id, 10) : undefined}
            shipMethod={mercariShipMethod}
            onChangeShipMethod={onChangeShipMethod}
            shippingPayerId={mercariShippingPayerId}
            onChangeShippingPayerId={onChangeShippingPayerId}
            weightLb={mercariWeightLb}
            onChangeWeightLb={onChangeWeightLb}
            weightOz={mercariWeightOz}
            onChangeWeightOz={onChangeWeightOz}
            dimL={mercariDimL}
            onChangeDimL={onChangeDimL}
            dimW={mercariDimW}
            onChangeDimW={onChangeDimW}
            dimH={mercariDimH}
            onChangeDimH={onChangeDimH}
            selectedCarrier={mercariSelectedCarrier}
            onSelectCarrier={onSelectCarrier}
          />
          <MercariFeeBreakdown
            price={price}
            shipMethod={mercariShipMethod}
            shippingPayerId={mercariShippingPayerId}
            selectedCarrier={mercariSelectedCarrier}
          />
        </>
      )}
    </View>
  );
}

// ─── Mercari fee breakdown card ───────────────────────────────────────────────

function MercariFeeBreakdown({
  price,
  shipMethod,
  shippingPayerId,
  selectedCarrier,
}: {
  price: string;
  shipMethod: "SOYO" | "PREPAID";
  shippingPayerId: 1 | 2;
  selectedCarrier: any | null;
}) {
  const priceInCents = Math.round(Number(price) * 100);
  if (priceInCents <= 0) return null;

  const buyerPaysShipping = shipMethod === "PREPAID" && shippingPayerId === 1;
  const shippingCostInCents =
    buyerPaysShipping && typeof selectedCarrier?.fee === "number"
      ? selectedCarrier.fee
      : 0;
  const salesFeeInCents = Math.floor((priceInCents + shippingCostInCents) * 0.10);
  const labelCostInCents =
    shipMethod === "PREPAID" && shippingPayerId === 2 && typeof selectedCarrier?.fee === "number"
      ? selectedCarrier.fee
      : 0;
  const earningsInCents = priceInCents - salesFeeInCents - labelCostInCents;

  const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <View style={fee.card}>
      <Text style={fee.header}>Fee Breakdown</Text>
      <View style={fee.rows}>
        <View style={fee.row}>
          <Text style={fee.rowLabel}>Listing price</Text>
          <Text style={fee.rowValue}>{fmt(priceInCents)}</Text>
        </View>
        {buyerPaysShipping && shippingCostInCents > 0 && (
          <View style={fee.row}>
            <Text style={fee.rowMuted}>+ Buyer shipping</Text>
            <Text style={fee.rowMuted}>{fmt(shippingCostInCents)}</Text>
          </View>
        )}
        <View style={fee.row}>
          <Text style={fee.rowFee}>Mercari fee (10%)</Text>
          <Text style={fee.rowFee}>−{fmt(salesFeeInCents)}</Text>
        </View>
        {labelCostInCents > 0 && (
          <View style={fee.row}>
            <Text style={fee.rowMuted}>− Shipping label</Text>
            <Text style={fee.rowMuted}>−{fmt(labelCostInCents)}</Text>
          </View>
        )}
        <View style={fee.divider} />
        <View style={fee.row}>
          <Text style={fee.earningsLabel}>Your earnings</Text>
          <Text style={[fee.earningsValue, earningsInCents < 0 && fee.earningsNeg]}>
            {fmt(Math.max(0, earningsInCents))}
          </Text>
        </View>
      </View>
      <Text style={fee.footnote}>
        Mercari charges 10% of sale price{buyerPaysShipping ? " + buyer shipping" : ""}.
      </Text>
    </View>
  );
}

const fee = StyleSheet.create({
  card: {
    backgroundColor: "#fff1f2",
    borderWidth: 1,
    borderColor: "#fecdd3",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    fontSize: 11,
    fontWeight: "700",
    color: "#f87171",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  rows: { gap: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowLabel: { fontSize: 14, color: "#3f3f46" },
  rowValue: { fontSize: 14, fontWeight: "500", color: "#3f3f46" },
  rowMuted: { fontSize: 13, color: "#71717a" },
  rowFee: { fontSize: 14, color: "#dc2626", fontWeight: "500" },
  divider: { height: 1, backgroundColor: "#fecdd3", marginVertical: 4 },
  earningsLabel: { fontSize: 14, fontWeight: "700", color: "#18181b" },
  earningsValue: { fontSize: 14, fontWeight: "700", color: "#15803d" },
  earningsNeg: { color: "#dc2626" },
  footnote: { fontSize: 10, color: "#a1a1aa", marginTop: 10 },
});

// ─── Mercari category drill-down + search picker ──────────────────────────────

function MercariCategoryPicker({
  selected,
  onSelect,
}: {
  selected: MercariCat | null;
  onSelect: (cat: MercariCat | null) => void;
}) {
  const [stack, setStack] = useState<Array<{ id: string; label: string }>>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  const parentId = stack.length > 0 ? stack[stack.length - 1]!.id : "root";

  const { data: childrenData, isLoading: childrenLoading } = useQuery({
    queryKey: ["mercari-cats", parentId],
    queryFn: () => api.getMercariCategories(parentId, undefined, 200),
    select: (d: any) => (d?.data ?? []) as MercariCat[],
    enabled: !debouncedSearch,
    staleTime: 5 * 60 * 1000,
  });

  const { data: searchData, isFetching: searchLoading } = useQuery({
    queryKey: ["mercari-cats-search", debouncedSearch],
    queryFn: () => api.getMercariCategories(undefined, debouncedSearch, 50),
    select: (d: any) => (d?.data ?? []) as MercariCat[],
    enabled: debouncedSearch.length > 1,
    staleTime: 60_000,
  });

  const children = childrenData ?? [];
  const searchResults = searchData ?? [];
  const isSearching = debouncedSearch.length > 1;

  function drillInto(cat: MercariCat) {
    setStack((prev) => [...prev, { id: cat.id, label: cat.label }]);
    setSearch("");
    setDebouncedSearch("");
  }

  function goBack(toIndex: number) {
    setStack((prev) => prev.slice(0, toIndex));
  }

  function selectCat(cat: MercariCat) {
    onSelect(cat);
    setSearch("");
    setDebouncedSearch("");
    setStack([]);
  }

  // ── Selected state ──────────────────────────────────────────────────────────
  if (selected) {
    return (
      <Card label="Mercari Category *">
        <View style={mc.selectedRow}>
          <View style={{ flex: 1 }}>
            <Text style={mc.selectedLabel}>{selected.label}</Text>
            <Text style={mc.selectedPath} numberOfLines={1}>
              {selected.fullPath.join(" › ")}
            </Text>
          </View>
          <TouchableOpacity onPress={() => onSelect(null)} hitSlop={10}>
            <Feather name="x" size={18} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </Card>
    );
  }

  // ── Picker ──────────────────────────────────────────────────────────────────
  const listData: MercariCat[] = isSearching ? searchResults : children;
  const loading = isSearching ? searchLoading : childrenLoading;

  return (
    <Card label="Mercari Category *">
      {/* Search bar */}
      <View style={mc.searchRow}>
        <Feather name="search" size={15} color="#9ca3af" style={{ marginRight: 8 }} />
        <TextInput
          style={mc.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search categories…"
          returnKeyType="search"
          autoCorrect={false}
        />
        {loading && <ActivityIndicator size="small" color="#ef4444" />}
        {search.length > 0 && !loading && (
          <TouchableOpacity onPress={() => { setSearch(""); setDebouncedSearch(""); }} hitSlop={8}>
            <Feather name="x" size={15} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      {/* Breadcrumb (drill-down mode only) */}
      {!isSearching && stack.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={mc.breadcrumbScroll}
          contentContainerStyle={mc.breadcrumbContent}
        >
          <TouchableOpacity onPress={() => goBack(0)}>
            <Text style={mc.breadcrumbLink}>All</Text>
          </TouchableOpacity>
          {stack.map((crumb, i) => (
            <View key={i} style={mc.breadcrumbItem}>
              <Text style={mc.breadcrumbSep}> › </Text>
              <TouchableOpacity onPress={() => goBack(i + 1)}>
                <Text style={[mc.breadcrumbLink, i === stack.length - 1 && mc.breadcrumbCurrent]}>
                  {crumb.label}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Category list */}
      {loading && listData.length === 0 ? (
        <View style={mc.loadingRow}>
          <ActivityIndicator size="small" color="#ef4444" />
          <Text style={mc.loadingText}>Loading…</Text>
        </View>
      ) : listData.length === 0 ? (
        <Text style={mc.emptyText}>
          {isSearching
            ? `No categories found for "${debouncedSearch}"`
            : "No subcategories found."}
        </Text>
      ) : (
        <View style={mc.list}>
          {listData.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={mc.row}
              onPress={() => {
                if (isSearching || !cat.hasChildren) {
                  selectCat(cat);
                } else {
                  drillInto(cat);
                }
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={mc.rowLabel}>{cat.label}</Text>
                {isSearching && cat.fullPath.length > 1 && (
                  <Text style={mc.rowPath} numberOfLines={1}>
                    {cat.fullPath.join(" › ")}
                  </Text>
                )}
              </View>
              {!isSearching && cat.hasChildren && (
                <Feather name="chevron-right" size={16} color="#9ca3af" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </Card>
  );
}

const mc = StyleSheet.create({
  selectedRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fca5a5",
    borderRadius: 10, padding: 12,
  },
  selectedLabel: { fontSize: 14, fontWeight: "600", color: "#dc2626" },
  selectedPath: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  searchRow: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8,
    paddingHorizontal: 10, backgroundColor: "#fff", marginBottom: 10,
  },
  searchInput: {
    flex: 1, paddingVertical: Platform.OS === "ios" ? 11 : 8,
    fontSize: 14, color: "#111827",
  },
  breadcrumbScroll: { marginBottom: 8 },
  breadcrumbContent: { flexDirection: "row", alignItems: "center" },
  breadcrumbItem: { flexDirection: "row", alignItems: "center" },
  breadcrumbSep: { fontSize: 12, color: "#9ca3af" },
  breadcrumbLink: { fontSize: 12, color: "#6b7280" },
  breadcrumbCurrent: { color: "#111827", fontWeight: "600" },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
  loadingText: { fontSize: 13, color: "#9ca3af" },
  emptyText: { fontSize: 13, color: "#9ca3af", paddingVertical: 8 },
  list: { borderWidth: 1, borderColor: "#f3f4f6", borderRadius: 10, overflow: "hidden" },
  row: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: "#f3f4f6",
    backgroundColor: "#fff",
  },
  rowLabel: { fontSize: 14, color: "#111827" },
  rowPath: { fontSize: 11, color: "#9ca3af", marginTop: 1 },
});

// ─── Mercari shipping section ─────────────────────────────────────────────────

function MercariShippingSection({
  categoryId,
  shipMethod, onChangeShipMethod,
  shippingPayerId, onChangeShippingPayerId,
  weightLb, onChangeWeightLb,
  weightOz, onChangeWeightOz,
  dimL, onChangeDimL,
  dimW, onChangeDimW,
  dimH, onChangeDimH,
  selectedCarrier, onSelectCarrier,
}: {
  categoryId?: number;
  shipMethod: "SOYO" | "PREPAID"; onChangeShipMethod: (m: "SOYO" | "PREPAID") => void;
  shippingPayerId: 1 | 2; onChangeShippingPayerId: (p: 1 | 2) => void;
  weightLb: string; onChangeWeightLb: (v: string) => void;
  weightOz: string; onChangeWeightOz: (v: string) => void;
  dimL: string; onChangeDimL: (v: string) => void;
  dimW: string; onChangeDimW: (v: string) => void;
  dimH: string; onChangeDimH: (v: string) => void;
  selectedCarrier: any | null; onSelectCarrier: (c: any | null) => void;
}) {
  const totalOz = (parseFloat(weightLb) || 0) * 16 + (parseFloat(weightOz) || 0);
  const dimLn = parseFloat(dimL) || 0;
  const dimWn = parseFloat(dimW) || 0;
  const dimHn = parseFloat(dimH) || 0;
  const hasDims = dimLn > 0 && dimWn > 0 && dimHn > 0;

  const { data: carriersData, isFetching: carriersLoading, error: carriersErr } = useQuery({
    queryKey: ["mercari-carriers", categoryId, Math.round(totalOz), dimLn, dimWn, dimHn],
    queryFn: () =>
      api.getMercariShippingCarriers({
        ...(categoryId ? { categoryId } : {}),
        packageWeight: Math.round(totalOz),
        ...(hasDims ? { dimension: { length: dimLn, width: dimWn, height: dimHn } } : {}),
      }),
    select: (d: any) =>
      (d?.data?.data?.availableShippingClassesV2?.shippingClasses ?? []) as any[],
    enabled: shipMethod === "PREPAID" && totalOz > 0,
    staleTime: 60_000,
  });

  const carriers: any[] = carriersData ?? [];
  const carriersError = carriersErr ? (carriersErr as Error).message : null;

  return (
    <Card label="Shipping Method">
      {/* Method toggle */}
      <View style={sh.toggle}>
        {(["SOYO", "PREPAID"] as const).map((m) => (
          <TouchableOpacity
            key={m}
            style={[sh.toggleBtn, shipMethod === m && sh.toggleBtnActive]}
            onPress={() => {
              onChangeShipMethod(m);
              onSelectCarrier(null);
            }}
          >
            <Text style={[sh.toggleText, shipMethod === m && sh.toggleTextActive]}>
              {m === "SOYO" ? "Ship on Your Own" : "Prepaid Label"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {shipMethod === "PREPAID" && (
        <>
          {/* Payer toggle */}
          <View style={{ marginTop: 14 }}>
            <Text style={sh.label}>Who Pays Shipping?</Text>
            <View style={sh.toggle}>
              {([1, 2] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[sh.toggleBtn, shippingPayerId === p && sh.toggleBtnActive]}
                  onPress={() => onChangeShippingPayerId(p)}
                >
                  <Text style={[sh.toggleText, shippingPayerId === p && sh.toggleTextActive]}>
                    {p === 1 ? "Buyer Pays" : "Seller Pays"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Weight */}
          <View style={{ marginTop: 14 }}>
            <Text style={sh.label}>Package Weight *</Text>
            <View style={sh.weightRow}>
              <View style={sh.weightField}>
                <TextInput
                  style={sh.weightInput}
                  value={weightLb}
                  onChangeText={onChangeWeightLb}
                  placeholder="0"
                  keyboardType="decimal-pad"
                />
                <Text style={sh.weightUnit}>lb</Text>
              </View>
              <View style={sh.weightField}>
                <TextInput
                  style={sh.weightInput}
                  value={weightOz}
                  onChangeText={onChangeWeightOz}
                  placeholder="0"
                  keyboardType="decimal-pad"
                />
                <Text style={sh.weightUnit}>oz</Text>
              </View>
            </View>
          </View>

          {/* Dimensions */}
          <View style={{ marginTop: 14 }}>
            <Text style={sh.label}>Dimensions (inches) — optional</Text>
            <View style={sh.dimRow}>
              <TextInput
                style={sh.dimInput}
                value={dimL}
                onChangeText={onChangeDimL}
                placeholder="L"
                keyboardType="decimal-pad"
              />
              <Text style={sh.dimSep}>×</Text>
              <TextInput
                style={sh.dimInput}
                value={dimW}
                onChangeText={onChangeDimW}
                placeholder="W"
                keyboardType="decimal-pad"
              />
              <Text style={sh.dimSep}>×</Text>
              <TextInput
                style={sh.dimInput}
                value={dimH}
                onChangeText={onChangeDimH}
                placeholder="H"
                keyboardType="decimal-pad"
              />
            </View>
            <Text style={sh.hint}>Length × Width × Height — narrows the carrier list.</Text>
          </View>

          {/* Carriers */}
          {totalOz > 0 && (
            <View style={{ marginTop: 14 }}>
              {carriersLoading ? (
                <View style={sh.loadingRow}>
                  <ActivityIndicator size="small" color="#ef4444" />
                  <Text style={sh.loadingText}>Loading available carriers…</Text>
                </View>
              ) : carriersError ? (
                <View style={sh.errorBanner}>
                  <Feather name="alert-circle" size={13} color="#dc2626" />
                  <Text style={sh.errorText}>{carriersError}</Text>
                </View>
              ) : carriers.length === 0 ? (
                <Text style={sh.hint}>
                  No carriers available for this weight. Try adjusting the package details.
                </Text>
              ) : (
                <>
                  <Text style={sh.label}>Select Carrier</Text>
                  <View style={{ gap: 8, marginTop: 6 }}>
                    {carriers.map((carrier: any) => {
                      const carrierId = String(carrier.id ?? "");
                      const label: string = carrier.requestClassDisplayName ?? carrier.name ?? "Unknown";
                      const carrierName: string = carrier.carrierDisplayName ?? carrier.carrier ?? "";
                      const fee: number | undefined = carrier.fee;
                      const priceStr = typeof fee === "number" ? `$${(fee / 100).toFixed(2)}` : "";
                      const eta: string = carrier.etaForSeller ?? "";
                      const isSelected = selectedCarrier?.id != null && String(selectedCarrier.id) === carrierId;
                      return (
                        <TouchableOpacity
                          key={carrierId}
                          style={[sh.carrierRow, isSelected && sh.carrierRowSelected]}
                          onPress={() => onSelectCarrier(isSelected ? null : carrier)}
                        >
                          <View style={[sh.radio, isSelected && sh.radioSelected]}>
                            {isSelected && <View style={sh.radioDot} />}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={sh.carrierLabel}>{label}</Text>
                            {carrierName ? (
                              <Text style={sh.carrierSub}>{carrierName}</Text>
                            ) : null}
                          </View>
                          <View style={{ alignItems: "flex-end" }}>
                            {priceStr ? (
                              <Text style={sh.carrierPrice}>{priceStr}</Text>
                            ) : null}
                            {eta ? <Text style={sh.carrierEta}>{eta}</Text> : null}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}
            </View>
          )}
        </>
      )}
    </Card>
  );
}

const sh = StyleSheet.create({
  toggle: {
    flexDirection: "row", borderWidth: 1, borderColor: "#e5e7eb",
    borderRadius: 10, backgroundColor: "#f9fafb", padding: 3, gap: 3,
  },
  toggleBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center",
  },
  toggleBtnActive: { backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 2, elevation: 1 },
  toggleText: { fontSize: 12, fontWeight: "600", color: "#6b7280" },
  toggleTextActive: { color: "#111827" },
  label: { fontSize: 12, fontWeight: "600", color: "#6b7280", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.4 },
  hint: { fontSize: 12, color: "#9ca3af", marginTop: 4 },
  weightRow: { flexDirection: "row", gap: 12 },
  weightField: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  weightInput: {
    flex: 1, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: Platform.OS === "ios" ? 10 : 7,
    fontSize: 14, color: "#111827", backgroundColor: "#fff", textAlign: "center",
  },
  weightUnit: { fontSize: 13, color: "#6b7280", width: 18 },
  dimRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dimInput: {
    flex: 1, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: Platform.OS === "ios" ? 10 : 7,
    fontSize: 14, color: "#111827", backgroundColor: "#fff", textAlign: "center",
  },
  dimSep: { fontSize: 14, color: "#9ca3af" },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  loadingText: { fontSize: 13, color: "#9ca3af" },
  errorBanner: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca",
    borderRadius: 8, padding: 10,
  },
  errorText: { flex: 1, fontSize: 12, color: "#dc2626" },
  carrierRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12,
    padding: 12, backgroundColor: "#fff",
  },
  carrierRowSelected: { borderColor: "#ef4444", backgroundColor: "#fef2f2" },
  radio: {
    width: 18, height: 18, borderRadius: 9, borderWidth: 2,
    borderColor: "#d1d5db", alignItems: "center", justifyContent: "center",
  },
  radioSelected: { borderColor: "#ef4444" },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#ef4444" },
  carrierLabel: { fontSize: 13, fontWeight: "500", color: "#111827" },
  carrierSub: { fontSize: 11, color: "#6b7280", marginTop: 1 },
  carrierPrice: { fontSize: 13, fontWeight: "600", color: "#111827" },
  carrierEta: { fontSize: 11, color: "#6b7280", marginTop: 1 },
});

// ─── Step 3: eBay – category, aspects, policies ───────────────────────────────

function Step3Ebay({
  categoryQuery, onChangeCategoryQuery, categorySearching,
  categoryResults, selectedCategory, onSelectCategory, onClearCategory,
  aspects, aspectsLoading, aspectsError,
  specificValues, customMode, onSetAspectValue, onToggleCustomMode,
  extraSpecifics, onChangeExtraSpecifics,
  fulfillmentPolicies, fulfillmentPolicyId, onSelectFulfillment,
  paymentPolicies, paymentPolicyId, onSelectPayment,
  returnPolicies, returnPolicyId, onSelectReturn,
  policiesLoading,
}: {
  categoryQuery: string; onChangeCategoryQuery: (v: string) => void;
  categorySearching: boolean; categoryResults: any[];
  selectedCategory: SelectedCategory | null;
  onSelectCategory: (cat: any) => void; onClearCategory: () => void;
  aspects: Aspect[]; aspectsLoading: boolean; aspectsError: string | null;
  specificValues: Record<string, string>;
  customMode: Set<string>;
  onSetAspectValue: (name: string, value: string) => void;
  onToggleCustomMode: (name: string, on: boolean) => void;
  extraSpecifics: { name: string; value: string }[];
  onChangeExtraSpecifics: (v: { name: string; value: string }[]) => void;
  fulfillmentPolicies: any[]; fulfillmentPolicyId: string; onSelectFulfillment: (id: string) => void;
  paymentPolicies: any[]; paymentPolicyId: string; onSelectPayment: (id: string) => void;
  returnPolicies: any[]; returnPolicyId: string; onSelectReturn: (id: string) => void;
  policiesLoading: boolean;
}) {
  const requiredAspects = aspects.filter((a) => a.required);
  const optionalAspects = aspects.filter((a) => !a.required);
  const missingCount = requiredAspects.filter(
    (a) => !specificValues[a.name]?.trim()
  ).length;

  return (
    <View>
      <Text style={s.stepTitle}>eBay Settings</Text>

      {/* ── Category ─────────────────────────────────── */}
      <Card label="Category *">
        {selectedCategory ? (
          <View style={s.selectedCat}>
            <View style={{ flex: 1 }}>
              <Text style={s.selectedCatName}>{selectedCategory.categoryName}</Text>
              <Text style={s.selectedCatBreadcrumb} numberOfLines={1}>
                {selectedCategory.breadcrumb}
              </Text>
            </View>
            <TouchableOpacity onPress={onClearCategory} hitSlop={8}>
              <Feather name="x" size={18} color="#6b7280" />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={s.searchRow}>
              <Feather name="search" size={15} color="#9ca3af" style={{ marginRight: 8 }} />
              <TextInput
                style={s.searchInput}
                value={categoryQuery}
                onChangeText={onChangeCategoryQuery}
                placeholder='Search e.g. "sneakers", "jeans"…'
                returnKeyType="search"
              />
              {categorySearching && (
                <ActivityIndicator size="small" color="#9ca3af" />
              )}
            </View>

            {categoryResults.length > 0 && (
              <View style={s.categoryDropdown}>
                {categoryResults.slice(0, 8).map((cat: any) => (
                  <TouchableOpacity
                    key={cat.categoryId}
                    style={s.categoryItem}
                    onPress={() => onSelectCategory(cat)}
                  >
                    <Text style={s.categoryItemName}>{cat.categoryName}</Text>
                    {cat.breadcrumb ? (
                      <Text style={s.categoryItemBreadcrumb} numberOfLines={1}>
                        {cat.breadcrumb}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {categoryQuery.length > 1 && !categorySearching && categoryResults.length === 0 && (
              <Text style={[s.hint, { marginTop: 8 }]}>
                No categories found for "{categoryQuery}"
              </Text>
            )}
          </>
        )}
      </Card>

      {/* ── Item Specifics ───────────────────────────── */}
      {selectedCategory && (
        <Card
          label={
            aspectsLoading
              ? "Item Specifics (loading…)"
              : aspects.length > 0
                ? `Item Specifics  ·  ${requiredAspects.length} required · ${optionalAspects.length} optional`
                : "Item Specifics"
          }
        >
          {aspectsLoading ? (
            <View style={s.loadingRow}>
              <ActivityIndicator size="small" color="#ea580c" />
              <Text style={s.loadingText}>Loading item specifics…</Text>
            </View>
          ) : aspectsError ? (
            <View style={s.errorBanner}>
              <Feather name="alert-circle" size={14} color="#dc2626" />
              <Text style={s.errorBannerText}>{aspectsError}</Text>
            </View>
          ) : aspects.length === 0 ? (
            <Text style={s.hint}>No standard specifics for this category.</Text>
          ) : (
            <View>
              {/* Required */}
              {requiredAspects.length > 0 && (
                <View style={[
                  s.aspectGroup,
                  missingCount === 0 ? s.aspectGroupDone : s.aspectGroupPending,
                ]}>
                  <View style={s.aspectGroupHeader}>
                    <View style={[
                      s.aspectBadge,
                      missingCount === 0 ? s.aspectBadgeDone : s.aspectBadgePending,
                    ]}>
                      <Text style={s.aspectBadgeText}>
                        {missingCount === 0 ? "✓" : String(missingCount)}
                      </Text>
                    </View>
                    <Text style={[
                      s.aspectGroupLabel,
                      missingCount === 0 ? s.aspectGroupLabelDone : s.aspectGroupLabelPending,
                    ]}>
                      {missingCount === 0
                        ? "All required fields complete"
                        : "Required by eBay for this category"}
                    </Text>
                  </View>

                  {requiredAspects.map((aspect) => (
                    <AspectField
                      key={aspect.name}
                      aspect={aspect}
                      value={specificValues[aspect.name] ?? ""}
                      isCustomMode={customMode.has(aspect.name)}
                      onSetValue={(v) => onSetAspectValue(aspect.name, v)}
                      onToggleCustom={(on) => onToggleCustomMode(aspect.name, on)}
                      highlight={!specificValues[aspect.name]?.trim()}
                    />
                  ))}
                </View>
              )}

              {/* Optional */}
              {optionalAspects.length > 0 && (
                <View style={{ marginTop: 12 }}>
                  <Text style={s.optionalLabel}>
                    Optional — improves search visibility
                  </Text>
                  {optionalAspects.map((aspect) => (
                    <AspectField
                      key={aspect.name}
                      aspect={aspect}
                      value={specificValues[aspect.name] ?? ""}
                      isCustomMode={customMode.has(aspect.name)}
                      onSetValue={(v) => onSetAspectValue(aspect.name, v)}
                      onToggleCustom={(on) => onToggleCustomMode(aspect.name, on)}
                    />
                  ))}
                </View>
              )}

              {/* Extra free-form */}
              {extraSpecifics.map((spec, i) => (
                <View key={i} style={s.extraRow}>
                  <TextInput
                    style={[s.input, { flex: 1, marginBottom: 0 }]}
                    value={spec.name}
                    onChangeText={(v) => {
                      const next = [...extraSpecifics];
                      next[i] = { ...next[i]!, name: v };
                      onChangeExtraSpecifics(next);
                    }}
                    placeholder="Attribute name"
                  />
                  <TextInput
                    style={[s.input, { flex: 1.5, marginBottom: 0 }]}
                    value={spec.value}
                    onChangeText={(v) => {
                      const next = [...extraSpecifics];
                      next[i] = { ...next[i]!, value: v };
                      onChangeExtraSpecifics(next);
                    }}
                    placeholder="Value"
                  />
                  <TouchableOpacity
                    onPress={() =>
                      onChangeExtraSpecifics(extraSpecifics.filter((_, j) => j !== i))
                    }
                    style={s.extraRemove}
                  >
                    <Feather name="trash-2" size={15} color="#9ca3af" />
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity
                style={s.addSpecificBtn}
                onPress={() =>
                  onChangeExtraSpecifics([...extraSpecifics, { name: "", value: "" }])
                }
              >
                <Feather name="plus" size={14} color="#ea580c" />
                <Text style={s.addSpecificText}>Add custom specific</Text>
              </TouchableOpacity>
            </View>
          )}
        </Card>
      )}

      {/* ── Policies ─────────────────────────────────── */}
      <Card label="Business Policies *">
        {policiesLoading ? (
          <View style={s.loadingRow}>
            <ActivityIndicator size="small" color="#ea580c" />
            <Text style={s.loadingText}>Loading eBay policies…</Text>
          </View>
        ) : fulfillmentPolicies.length === 0 && paymentPolicies.length === 0 ? (
          <Text style={s.hint}>
            No eBay business policies found. Set them up on ebay.com or use the
            web app to run policy setup.
          </Text>
        ) : (
          <>
            <PolicyPicker
              label="Fulfillment"
              items={fulfillmentPolicies}
              idKey="fulfillmentPolicyId"
              selectedId={fulfillmentPolicyId}
              onSelect={onSelectFulfillment}
            />
            <PolicyPicker
              label="Payment"
              items={paymentPolicies}
              idKey="paymentPolicyId"
              selectedId={paymentPolicyId}
              onSelect={onSelectPayment}
            />
            <PolicyPicker
              label="Return"
              items={returnPolicies}
              idKey="returnPolicyId"
              selectedId={returnPolicyId}
              onSelect={onSelectReturn}
            />
          </>
        )}
      </Card>
    </View>
  );
}

// ─── AspectField ──────────────────────────────────────────────────────────────

function AspectField({
  aspect, value, isCustomMode, onSetValue, onToggleCustom, highlight = false,
}: {
  aspect: Aspect;
  value: string;
  isCustomMode: boolean;
  onSetValue: (v: string) => void;
  onToggleCustom: (on: boolean) => void;
  highlight?: boolean;
}) {
  const hasSuggestions = aspect.suggestedValues.length > 0;

  return (
    <View style={af.wrap}>
      <Text style={af.label}>
        {aspect.name}
        {aspect.required && <Text style={af.required}> *</Text>}
      </Text>

      {hasSuggestions && !isCustomMode ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={af.chipScroll}
        >
          {aspect.suggestedValues.slice(0, 12).map((v) => (
            <TouchableOpacity
              key={v}
              style={[af.chip, value === v && af.chipSelected, highlight && !value && af.chipHighlight]}
              onPress={() => onSetValue(value === v ? "" : v)}
            >
              <Text style={[af.chipText, value === v && af.chipTextSelected]}>{v}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={af.chip}
            onPress={() => { onToggleCustom(true); onSetValue(""); }}
          >
            <Text style={af.chipText}>Other…</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <View style={af.freeRow}>
          <TextInput
            style={[
              af.input,
              highlight && !value && af.inputHighlight,
            ]}
            value={value}
            onChangeText={onSetValue}
            placeholder={`Enter ${aspect.name}…`}
          />
          {hasSuggestions && isCustomMode && (
            <TouchableOpacity
              style={af.backToList}
              onPress={() => { onToggleCustom(false); onSetValue(""); }}
            >
              <Feather name="list" size={15} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const af = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  required: { color: "#ea580c" },
  chipScroll: { flexDirection: "row", gap: 6, paddingBottom: 2 },
  chip: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 16,
    paddingHorizontal: 11,
    paddingVertical: 6,
    backgroundColor: "#f9fafb",
  },
  chipSelected: { borderColor: "#ea580c", backgroundColor: "#fff7ed" },
  chipHighlight: { borderColor: "#fcd34d", backgroundColor: "#fffbeb" },
  chipText: { fontSize: 13, color: "#6b7280" },
  chipTextSelected: { color: "#ea580c", fontWeight: "600" },
  freeRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#fff",
  },
  inputHighlight: { borderColor: "#fcd34d", backgroundColor: "#fffbeb" },
  backToList: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 9,
  },
});

// ─── PolicyPicker ─────────────────────────────────────────────────────────────

function PolicyPicker({
  label, items, idKey, selectedId, onSelect,
}: {
  label: string; items: any[]; idKey: string;
  selectedId: string; onSelect: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <View style={pp.wrap}>
      <Text style={pp.label}>{label}</Text>
      {items.map((p) => {
        const id = p[idKey];
        const selected = id === selectedId;
        return (
          <TouchableOpacity
            key={id}
            style={[pp.row, selected && pp.rowSelected]}
            onPress={() => onSelect(id)}
          >
            <Text style={[pp.text, selected && pp.textSelected]} numberOfLines={1}>
              {p.name}
            </Text>
            {selected && <Feather name="check" size={14} color="#ea580c" />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const pp = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: "700", color: "#6b7280", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  row: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8,
    borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#f9fafb", marginBottom: 6,
  },
  rowSelected: { borderColor: "#ea580c", backgroundColor: "#fff7ed" },
  text: { flex: 1, fontSize: 13, color: "#374151" },
  textSelected: { color: "#ea580c", fontWeight: "600" },
});

// ─── Shared helpers ───────────────────────────────────────────────────────────

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={s.card}>
      <Text style={s.cardLabel}>{label}</Text>
      {children}
    </View>
  );
}

function FieldLabel({ label }: { label: string }) {
  return <Text style={s.fieldLabel}>{label}</Text>;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  content: { padding: 16, paddingBottom: 48 },

  stepBar: { flexDirection: "row", gap: 6, marginBottom: 20 },
  stepDot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: "#e5e7eb" },
  stepDotActive: { backgroundColor: "#ea580c" },

  stepTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 16 },

  card: {
    backgroundColor: "#fff", borderRadius: 14, padding: 16,
    marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.04,
    shadowRadius: 6, elevation: 1,
  },
  cardLabel: {
    fontSize: 11, fontWeight: "700", color: "#ea580c",
    textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 14,
  },

  fieldLabel: { fontSize: 12, fontWeight: "600", color: "#6b7280", marginBottom: 5, marginTop: 12 },
  input: {
    borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: Platform.OS === "ios" ? 12 : 9,
    fontSize: 15, color: "#111827", backgroundColor: "#fff", marginBottom: 4,
  },
  charCount: { fontSize: 11, color: "#9ca3af", textAlign: "right", marginBottom: 4 },
  textarea: { height: 110, paddingTop: 10 },
  hint: { fontSize: 13, color: "#9ca3af", lineHeight: 19 },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#f9fafb",
  },
  chipActive: { borderColor: "#ea580c", backgroundColor: "#fff7ed" },
  chipText: { fontSize: 13, color: "#6b7280" },
  chipTextActive: { color: "#ea580c", fontWeight: "600" },

  // Category
  searchRow: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8,
    paddingHorizontal: 10, backgroundColor: "#fff",
  },
  searchInput: {
    flex: 1, paddingVertical: Platform.OS === "ios" ? 12 : 9, fontSize: 15, color: "#111827",
  },
  categoryDropdown: {
    marginTop: 8, borderWidth: 1, borderColor: "#e5e7eb",
    borderRadius: 10, overflow: "hidden",
  },
  categoryItem: {
    paddingHorizontal: 12, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: "#f3f4f6",
  },
  categoryItemName: { fontSize: 14, fontWeight: "500", color: "#111827" },
  categoryItemBreadcrumb: { fontSize: 12, color: "#9ca3af", marginTop: 1 },
  selectedCat: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#fff7ed", borderWidth: 1, borderColor: "#ea580c",
    borderRadius: 8, padding: 12,
  },
  selectedCatName: { fontSize: 14, fontWeight: "600", color: "#ea580c" },
  selectedCatBreadcrumb: { fontSize: 12, color: "#9ca3af", marginTop: 1 },

  // Aspects
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  loadingText: { fontSize: 13, color: "#9ca3af" },
  errorBanner: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#fef2f2", borderRadius: 8, padding: 10,
    borderWidth: 1, borderColor: "#fecaca",
  },
  errorBannerText: { flex: 1, fontSize: 13, color: "#dc2626" },
  aspectGroup: { borderRadius: 10, padding: 12, borderWidth: 1 },
  aspectGroupDone: { borderColor: "#bbf7d0", backgroundColor: "#f0fdf4" },
  aspectGroupPending: { borderColor: "#fed7aa", backgroundColor: "#fff7ed" },
  aspectGroupHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  aspectBadge: {
    width: 20, height: 20, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  aspectBadgeDone: { backgroundColor: "#22c55e" },
  aspectBadgePending: { backgroundColor: "#ea580c" },
  aspectBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  aspectGroupLabel: { fontSize: 12, fontWeight: "700" },
  aspectGroupLabelDone: { color: "#15803d" },
  aspectGroupLabelPending: { color: "#c2410c" },
  optionalLabel: {
    fontSize: 11, fontWeight: "700", color: "#9ca3af",
    textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 10,
  },
  extraRow: { flexDirection: "row", gap: 8, marginBottom: 8, alignItems: "center" },
  extraRemove: { padding: 6 },
  addSpecificBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  addSpecificText: { fontSize: 13, color: "#ea580c", fontWeight: "600" },

  // Picks
  pickRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 10, paddingHorizontal: 4, borderRadius: 8, marginBottom: 4,
  },
  pickRowSelected: { backgroundColor: "#fff7ed" },
  pickThumb: { width: 44, height: 44, borderRadius: 8 },
  pickThumbEmpty: {
    backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center",
  },
  pickInfo: { flex: 1 },
  pickTitle: { fontSize: 14, fontWeight: "500", color: "#111827" },
  pickMeta: { fontSize: 12, color: "#6b7280", marginTop: 1 },

  // Navigation
  navRow: { flexDirection: "row", gap: 10, marginTop: 8, alignItems: "center" },
  backBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12,
    borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#fff",
  },
  backBtnText: { fontSize: 14, fontWeight: "600", color: "#6b7280" },
  nextBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, backgroundColor: "#ea580c", paddingVertical: 14, borderRadius: 12,
  },
  nextBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  submitRow: { flex: 1, flexDirection: "row", gap: 10 },
  draftBtn: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingVertical: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: "#ea580c", backgroundColor: "#fff",
  },
  draftBtnText: { color: "#ea580c", fontWeight: "700", fontSize: 14 },
  publishBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 14, borderRadius: 12, backgroundColor: "#ea580c",
  },
  publishBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  btnDisabled: { opacity: 0.6 },

});
