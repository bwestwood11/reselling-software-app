import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import type { WebViewMessageEvent } from "react-native-webview";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { api } from "../src/lib/api";
import { MERCARI_CONDITION_MAP } from "@repo/types";

// Mercari uses GraphQL at POST /v1/api (confirmed from network logs).
// Mutations confirmed: uploadTempListingPhotos, createListing.
// Running inside www.mercari.com WebView = session cookies + no Cloudflare blocking.

function buildPublishScript(listing: any, token: string): string {
  const title = listing.title ?? "";
  const description = listing.description ?? "";
  // listing.price is stored in dollars; Mercari expects cents
  const price = Math.round(Number(listing.price) * 100);
  const condition = MERCARI_CONDITION_MAP[listing.inventoryItem?.condition ?? "GOOD"] ?? 4;
  const imageUrls: string[] = (listing.inventoryItem?.images ?? [])
    .map((img: any) => String(img.url))
    .filter(Boolean);
  // categoryId / sizeId / zipCode stored in marketplaceData when the listing was created
  const categoryId: number | null =
    Number((listing.marketplaceData as any)?.categoryId) || null;
  const sizeId: number | null =
    Number((listing.marketplaceData as any)?.sizeId) || null;
  const fallbackZip: string = (listing.marketplaceData as any)?.zipCode ?? "";
  const isShippingSoyo: boolean =
    (listing.marketplaceData as any)?.shipping?.method !== "PREPAID";
  // shippingPayerId: 1 = buyer pays, 2 = seller pays; SOYO always uses 2
  const shippingPayerId: number = isShippingSoyo
    ? 2
    : Number((listing.marketplaceData as any)?.shipping?.shippingPayerId) || 1;
  // shippingCost in cents — from the selected carrier's fee field
  const shippingCost: number =
    typeof (listing.marketplaceData as any)?.shipping?.shippingCost === "number"
      ? (listing.marketplaceData as any).shipping.shippingCost
      : 0;
  // PREPAID: specific carrier class and package weight
  const shippingClassId: number | null =
    Number((listing.marketplaceData as any)?.shipping?.shippingClassId) || null;
  const shippingPackageWeight: number =
    Number((listing.marketplaceData as any)?.shipping?.weightOz) || 0;
  // SOYO → class [0]; PREPAID → [shippingClassId] or fallback [3]
  const resolvedClassIds: number[] = isShippingSoyo
    ? [0]
    : shippingClassId !== null ? [shippingClassId] : [3];

  return `
(async function() {
  function log(msg) {
    try { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'log', msg: String(msg) })); } catch(e) {}
  }

  var token       = ${JSON.stringify(token)};
  var imageUrls   = ${JSON.stringify(imageUrls)};
  var title       = ${JSON.stringify(title)};
  var description = ${JSON.stringify(description)};
  var price       = ${price};
  var condition   = ${condition};
  var categoryId  = ${categoryId ?? "null"};
  var sizeId      = ${sizeId ?? "null"};
  var zipCode     = ${JSON.stringify(fallbackZip)};

  log('Starting Mercari publish via GraphQL...');
  log('categoryId: ' + categoryId);

  // ── Fetch zip code from Mercari profile (avoids asking user for it) ────────
  if (!zipCode) {
    try {
      var profileRes = await fetch('/v1/api', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ query: 'query { me { zipCode } }', variables: {} })
      });
      var profileText = await profileRes.text();
      log('Profile response: ' + profileText.slice(0, 300));
      var profileData = JSON.parse(profileText);
      zipCode = (profileData.data && profileData.data.me && profileData.data.me.zipCode) || '';
      if (zipCode) log('Got zipCode from profile: ' + zipCode);
    } catch (ze) { log('Profile query error: ' + ze.message); }
  }

  if (!zipCode) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: 'Zip code not found. Add your zip code to your Mercari account.', detail: 'Could not retrieve zip code from Mercari profile.' }));
    return;
  }

  // ── Extract CSRF token that Mercari's own React app sends with every request ──
  var csrfToken = '';
  try {
    // 1. Cookies (try common names)
    var cookieArr = document.cookie.split(';');
    var csrfCookieNames = ['csrf_token','xsrf-token','_csrf','x-csrf-token','mercari-csrf'];
    for (var ci = 0; ci < cookieArr.length; ci++) {
      var ck = cookieArr[ci].trim();
      var ckName = ck.split('=')[0].trim().toLowerCase();
      if (csrfCookieNames.indexOf(ckName) !== -1) {
        csrfToken = decodeURIComponent(ck.split('=').slice(1).join('='));
        log('CSRF cookie (' + ck.split('=')[0].trim() + '): ' + csrfToken.slice(0, 30));
        break;
      }
    }
    // 2. <meta name="csrf-token">
    if (!csrfToken) {
      var metaEl = document.querySelector('meta[name="csrf-token"],meta[name="csrf_token"],meta[name="x-csrf-token"]');
      if (metaEl) { csrfToken = metaEl.getAttribute('content') || ''; log('CSRF meta: ' + csrfToken.slice(0, 30)); }
    }
    // 3. Common window globals
    if (!csrfToken) {
      var wg = ['csrfToken','csrf_token','CSRF_TOKEN','__csrf','_csrf'];
      for (var gi = 0; gi < wg.length; gi++) {
        if (typeof window[wg[gi]] === 'string' && window[wg[gi]]) {
          csrfToken = window[wg[gi]]; log('CSRF window.' + wg[gi] + ': ' + csrfToken.slice(0, 30)); break;
        }
      }
    }
    if (!csrfToken) log('CSRF token not found — listing all cookies: ' + document.cookie.slice(0, 400));
  } catch (csrfErr) { log('CSRF extraction error: ' + csrfErr.message); }

  // ── Step 1: upload photos via uploadTempListingPhotos mutation ─────────────
  var uploadIds = [];

  for (var i = 0; i < imageUrls.length; i++) {
    try {
      log('Uploading photo ' + (i + 1) + ' of ' + imageUrls.length + '...');

      var imgRes = await fetch(imageUrls[i]);
      if (!imgRes.ok) { log('Could not fetch image: ' + imgRes.status); continue; }
      var blob = await imgRes.blob();

      // Apollo multipart upload spec
      var form = new FormData();
      form.append('operations', JSON.stringify({
        operationName: 'uploadTempListingPhotos',
        query: 'mutation uploadTempListingPhotos($input: UploadTempListingPhotosInput!) { uploadTempListingPhotos(input: $input) { uploadIds __typename } }',
        variables: { input: { photos: [null] } }
      }));
      form.append('map', JSON.stringify({ '0': ['variables.input.photos.0'] }));
      form.append('0', blob, 'photo.jpg');

      // Apollo-Require-Preflight bypasses Apollo Server's CSRF prevention for multipart uploads
      var upHeaders = { 'Authorization': 'Bearer ' + token, 'Apollo-Require-Preflight': 'true' };
      if (csrfToken) upHeaders['X-CSRF-Token'] = csrfToken;

      var upRes  = await fetch('/v1/api', { method: 'POST', body: form, credentials: 'include', headers: upHeaders });
      var upText = await upRes.text();
      log('Photo ' + (i + 1) + ' → ' + upRes.status + ': ' + upText.slice(0, 200));

      if (upRes.ok) {
        var upData = JSON.parse(upText);
        var ids = upData.data && upData.data.uploadTempListingPhotos && upData.data.uploadTempListingPhotos.uploadIds;
        if (ids && ids.length > 0) { uploadIds.push(ids[0]); log('Got uploadId: ' + ids[0]); }
      }
    } catch (imgErr) {
      log('Photo error: ' + imgErr.message);
    }
  }

  log(uploadIds.length + ' photo(s) uploaded. Creating listing...');

  // ── Step 2: create listing via createListing mutation ─────────────────────
  try {
    var shippingPayerId   = ${shippingPayerId};
    var shippingCost      = ${shippingCost};
    var shippingClassIds  = ${JSON.stringify(resolvedClassIds)};
    var shippingPkgWeight = ${shippingPackageWeight};
    var isShippingSoyo    = ${isShippingSoyo};
    var salesFee = shippingPayerId === 1
      ? Math.floor((price + shippingCost) * 0.10)
      : Math.floor(price * 0.10);
    log('shippingClassIds: ' + JSON.stringify(shippingClassIds) + ', payerId: ' + shippingPayerId + ', pkgWeight: ' + shippingPkgWeight + ', salesFee: ' + salesFee);
    var createInput = {
      name: title,
      description: description,
      price: price,
      salesFee: salesFee,
      photoIds: uploadIds,
      conditionId: condition,
      shippingPayerId: shippingPayerId,
      shippingClassIds: shippingClassIds,
      suggestedShippingClassIds: shippingClassIds,
      zipCode: zipCode,
    };
    if (!isShippingSoyo && shippingPkgWeight > 0) createInput.shippingPackageWeight = shippingPkgWeight;
    if (categoryId !== null) createInput.categoryId = categoryId;
    if (sizeId !== null) createInput.sizeId = sizeId;

    var createRes = await fetch('/v1/api', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({
        operationName: 'createListing',
        query: 'mutation createListing($input: CreateListingInput!) { createListing(input: $input) { id __typename } }',
        variables: { input: createInput }
      })
    });

    var createText = await createRes.text();
    log('createListing → ' + createRes.status + ': ' + createText.slice(0, 400));

    if (!createRes.ok) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: 'HTTP ' + createRes.status, detail: createText.slice(0, 400) }));
      return;
    }

    var createData = JSON.parse(createText);

    if (createData.errors && createData.errors.length > 0) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: createData.errors[0].message, detail: createText.slice(0, 400) }));
      return;
    }

    var itemId = createData.data && createData.data.createListing && createData.data.createListing.id;
    if (itemId) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'success', itemId: String(itemId) }));
    } else {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: 'No item ID in response', detail: createText.slice(0, 400) }));
    }
  } catch (err) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: err.message || 'Unknown error', detail: '' }));
  }
})();
true;
`;
}

type Stage = "loading" | "publishing" | "success" | "error";

export default function MercariPublishScreen() {
  const router = useRouter();
  const { listingId, otherPublished } = useLocalSearchParams<{
    listingId: string;
    otherPublished?: string;
  }>();

  const webViewRef  = useRef<WebView>(null);
  const scriptRef   = useRef<string | null>(null);
  const hasRun      = useRef(false);

  const [stage, setStage] = useState<Stage>("loading");
  const [error, setError]   = useState("");
  const [detail, setDetail] = useState("");
  const [logs, setLogs]     = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  function addLog(msg: string) {
    setLogs((prev) => [...prev.slice(-99), msg]);
  }

  // Fetch listing data + token, build the script, then mount the WebView
  useEffect(() => {
    if (!listingId) return;
    Promise.all([api.getListing(listingId), api.getMercariToken()])
      .then(([listingRes, tokenRes]) => {
        const listing = (listingRes as any).data;
        const token   = (tokenRes as any).data.accessToken;
        scriptRef.current = buildPublishScript(listing, token);
        setStage("publishing");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load listing");
        setStage("error");
      });
  }, [listingId]);

  // Called once when the WebView finishes loading www.mercari.com/sell/
  function handlePageLoad() {
    if (hasRun.current || !scriptRef.current) return;
    hasRun.current = true;
    webViewRef.current?.injectJavaScript(scriptRef.current);
  }

  async function handleMessage(event: WebViewMessageEvent) {
    try {
      const msg = JSON.parse(event.nativeEvent.data) as Record<string, unknown>;

      if (msg.type === "log") {
        addLog(String(msg.msg));
        return;
      }

      if (msg.type === "success") {
        const itemId = String(msg.itemId ?? "");
        addLog(`✓ Listed! itemId=${itemId}`);
        setStage("success");
        try {
          await api.recordMercariPublished(listingId, itemId);
        } catch (err) {
          addLog(`DB error: ${err instanceof Error ? err.message : String(err)}`);
        }
        setTimeout(() => router.back(), 2000);
      }

      if (msg.type === "error") {
        setError(String(msg.message ?? "Publish failed"));
        setDetail(String(msg.detail ?? ""));
        addLog(`Error: ${msg.message}`);
        if (msg.detail) addLog(String(msg.detail).slice(0, 200));
        setStage("error");
      }
    } catch {
      // non-JSON WebView message
    }
  }

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.sideBtn} hitSlop={8}>
          <Text style={s.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={s.title}>Publishing to Mercari</Text>
        <TouchableOpacity onPress={() => setShowLogs((v) => !v)} style={s.sideBtn} hitSlop={8}>
          <Text style={s.logsBtn}>{showLogs ? "Hide" : "Logs"}</Text>
        </TouchableOpacity>
      </View>

      {/* Hidden WebView — loads /sell/ to get Cloudflare clearance + session cookies,
          then we inject the GraphQL script which runs from the same origin */}
      {stage === "publishing" && (
        <View style={s.hiddenWebView}>
          <WebView
            ref={webViewRef}
            source={{ uri: "https://www.mercari.com/sell/" }}
            onLoadEnd={handlePageLoad}
            onMessage={handleMessage}
            javaScriptEnabled
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
          />
        </View>
      )}

      {/* ── Status UI ── */}
      {stage === "loading" && (
        <View style={s.centered}>
          <ActivityIndicator size="large" color="#ef4444" />
          <Text style={s.statusText}>Preparing…</Text>
        </View>
      )}

      {stage === "publishing" && (
        <View style={s.centered}>
          <ActivityIndicator size="large" color="#ef4444" />
          <Text style={s.statusText}>Publishing to Mercari…</Text>
          <Text style={s.subText}>This takes a few seconds</Text>
        </View>
      )}

      {stage === "success" && (
        <View style={s.centered}>
          <Feather name="check-circle" size={64} color="#22c55e" />
          <Text style={s.successText}>Listed on Mercari!</Text>
          {Number(otherPublished) > 0 && (
            <Text style={s.subText}>
              Also published to {otherPublished} other marketplace
              {Number(otherPublished) > 1 ? "s" : ""}
            </Text>
          )}
        </View>
      )}

      {stage === "error" && (
        <View style={s.centered}>
          <Feather name="alert-circle" size={64} color="#ef4444" />
          <Text style={s.errorTitle}>Publish Failed</Text>
          <Text style={s.errorMsg}>{error}</Text>
          {detail ? <Text style={s.errorDetail}>{detail.slice(0, 200)}</Text> : null}
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Text style={s.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Debug log drawer */}
      {showLogs && (
        <View style={s.logsDrawer}>
          <View style={s.logsHeader}>
            <Text style={s.logsLabel}>Debug log</Text>
            <TouchableOpacity onPress={() => setLogs([])} hitSlop={8}>
              <Text style={s.logsClear}>Clear</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={s.logsScroll}>
            {logs.length === 0
              ? <Text style={s.logLine}>No entries yet…</Text>
              : logs.map((line, i) => <Text key={i} style={s.logLine}>{line}</Text>)}
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#e4e4e7",
  },
  title: { fontSize: 16, fontWeight: "600", color: "#09090b" },
  sideBtn: { width: 56 },
  cancelText: { fontSize: 16, color: "#ef4444" },
  logsBtn: { fontSize: 13, color: "#6b7280", textAlign: "right" },

  // WebView is off-screen but must have real dimensions to load and execute JS
  hiddenWebView: {
    position: "absolute", left: -9999, top: -9999, width: 375, height: 812,
  },

  centered: {
    flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 32,
  },
  statusText: { fontSize: 17, fontWeight: "600", color: "#09090b", textAlign: "center" },
  subText: { fontSize: 14, color: "#6b7280", textAlign: "center" },
  successText: { fontSize: 24, fontWeight: "700", color: "#15803d", textAlign: "center" },
  errorTitle: { fontSize: 20, fontWeight: "700", color: "#dc2626", textAlign: "center" },
  errorMsg: { fontSize: 14, color: "#71717a", textAlign: "center", lineHeight: 20 },
  errorDetail: { fontSize: 11, color: "#9ca3af", textAlign: "center", fontFamily: "monospace", lineHeight: 16 },
  backBtn: {
    marginTop: 8, backgroundColor: "#ef4444",
    paddingHorizontal: 28, paddingVertical: 13, borderRadius: 10,
  },
  backBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  logsDrawer: {
    position: "absolute", bottom: 0, left: 0, right: 0, height: 260,
    backgroundColor: "#0f172a", borderTopLeftRadius: 12, borderTopRightRadius: 12, padding: 12,
  },
  logsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  logsLabel: { fontSize: 10, fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: 0.8 },
  logsClear: { fontSize: 12, color: "#ef4444" },
  logsScroll: { flex: 1 },
  logLine: { fontSize: 11, color: "#94a3b8", fontFamily: "monospace", lineHeight: 17 },
});
