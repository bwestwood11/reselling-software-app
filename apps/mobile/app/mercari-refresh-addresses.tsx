import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../src/lib/api";

const ADDRESSES_URL =
  "https://www.mercari.com/v1/api?operationName=DeliveryAddresses&variables=%7B%7D&extensions=%7B%22persistedQuery%22%3A%7B%22version%22%3A1%2C%22sha256Hash%22%3A%2260ae4e6793f7c6fcdd16b3aec263abd2ebef115ecabe86407b5c697fadef5f9c%22%7D%7D";

export default function MercariRefreshAddressesScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const webViewRef = useRef<WebView>(null);
  const [token, setToken] = useState<string | null>(null);
  const [pageReady, setPageReady] = useState(false);
  const [injected, setInjected] = useState(false);
  const [status, setStatus] = useState<"loading" | "fetching" | "done" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    api.getMercariToken()
      .then((res: any) => {
        const t = res?.data?.accessToken;
        if (!t) throw new Error("No token");
        setToken(t);
        setStatus("fetching");
      })
      .catch(() => {
        setErrorMsg("Mercari account not connected.");
        setStatus("error");
      });
  }, []);

  useEffect(() => {
    if (pageReady && token && !injected) {
      setInjected(true);
      const script = `
(function() {
  fetch(${JSON.stringify(ADDRESSES_URL)}, {
    headers: {
      'authorization': 'Bearer ' + ${JSON.stringify(token)},
      'content-type': 'application/json',
      'x-platform': 'web',
      'apollo-require-preflight': 'true',
      'x-app-version': '1',
    }
  }).then(function(r) { return r.json(); }).then(function(data) {
    var addresses = (data && data.data && data.data.deliveryAddresses) || [];
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mercari_addresses', addresses: addresses }));
  }).catch(function(err) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mercari_addresses_error', error: String(err) }));
  });
  true;
})();
      `;
      webViewRef.current?.injectJavaScript(script);
    }
  }, [pageReady, token, injected]);

  async function handleMessage(event: WebViewMessageEvent) {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "mercari_addresses") {
        await api.saveMercariAddresses(msg.addresses);
        await qc.invalidateQueries({ queryKey: ["mercari-addresses"] });
        setStatus("done");
        router.back();
      } else if (msg.type === "mercari_addresses_error") {
        setErrorMsg(msg.error || "Failed to fetch addresses from Mercari.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Unexpected error while refreshing addresses.");
      setStatus("error");
    }
  }

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.cancelBtn} hitSlop={8}>
          <Text style={s.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={s.title}>Refresh Addresses</Text>
        <View style={s.cancelBtn} />
      </View>

      {status === "error" ? (
        <View style={s.center}>
          <Text style={s.errorText}>{errorMsg}</Text>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Text style={s.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#ef4444" />
          <Text style={s.loadingText}>Fetching your Mercari addresses…</Text>
        </View>
      )}

      {token && status !== "error" && (
        <WebView
          ref={webViewRef}
          source={{ uri: "https://www.mercari.com/" }}
          onLoadEnd={() => setPageReady(true)}
          onMessage={handleMessage}
          javaScriptEnabled
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          style={s.hidden}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e4e4e7",
  },
  title: { fontSize: 16, fontWeight: "600", color: "#09090b" },
  cancelBtn: { width: 64 },
  cancelText: { fontSize: 16, color: "#ef4444" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 24 },
  loadingText: { fontSize: 15, color: "#52525b" },
  errorText: { fontSize: 15, color: "#dc2626", textAlign: "center" },
  backBtn: {
    backgroundColor: "#ef4444",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backBtnText: { fontSize: 15, fontWeight: "600", color: "#fff" },
  hidden: { width: 0, height: 0, position: "absolute" },
});
