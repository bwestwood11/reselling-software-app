import { useRef, useState, useCallback } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView, type WebViewMessageEvent, type WebViewNavigation } from "react-native-webview";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../src/lib/api";

// Injected before any page JS runs — intercepts Mercari's fetch calls to capture
// the accessToken directly from /v1/login or /v1/login_google responses.
const ADDRESSES_URL =
  "https://www.mercari.com/v1/api?operationName=DeliveryAddresses&variables=%7B%7D&extensions=%7B%22persistedQuery%22%3A%7B%22version%22%3A1%2C%22sha256Hash%22%3A%2260ae4e6793f7c6fcdd16b3aec263abd2ebef115ecabe86407b5c697fadef5f9c%22%7D%7D";

const INTERCEPT_SCRIPT = `
(function() {
  var _fetch = window.fetch;
  window.fetch = function() {
    var args = arguments;
    var url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '';
    return _fetch.apply(window, args).then(function(response) {
      if (url.indexOf('/v1/login') !== -1) {
        var clone = response.clone();
        clone.json().then(function(data) {
          if (data && data.accessToken) {
            var token = data.accessToken;
            var msg = {
              type: 'mercari_token',
              accessToken: token,
              accountId: data.user && data.user.userId ? String(data.user.userId) : undefined,
              accountName: data.user && (data.user.name || data.user.username || data.user.email) || undefined,
            };
            _fetch('${ADDRESSES_URL}', {
              headers: {
                'authorization': 'Bearer ' + token,
                'content-type': 'application/json',
                'x-platform': 'web',
                'apollo-require-preflight': 'true',
                'x-app-version': '1',
              }
            }).then(function(r) { return r.json(); }).then(function(addrData) {
              msg.addresses = (addrData && addrData.data && addrData.data.deliveryAddresses) || [];
              window.ReactNativeWebView.postMessage(JSON.stringify(msg));
            }).catch(function() {
              window.ReactNativeWebView.postMessage(JSON.stringify(msg));
            });
          }
        }).catch(function() {});
      }
      return response;
    });
  };
  true;
})();
`;

const LOGOUT_URL = "https://www.mercari.com/logout/";
const LOGIN_URL = "https://www.mercari.com/login/";

export default function MercariLoginScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const webViewRef = useRef<WebView>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [alreadyLoggedIn, setAlreadyLoggedIn] = useState(false);

  async function handleMessage(event: WebViewMessageEvent) {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type !== "mercari_token" || !msg.accessToken) return;

      setSaving(true);
      setAlreadyLoggedIn(false);
      await api.connectMercariToken(msg.accessToken, msg.accountId, msg.accountName, msg.addresses);
      await qc.invalidateQueries({ queryKey: ["marketplace-connections"] });
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save connection");
      setSaving(false);
    }
  }

  const handleNavigationStateChange = useCallback((state: WebViewNavigation) => {
    if (!state.url) return;
    // If Mercari redirected away from /login/ it means cookies are still valid
    // and the user is already authenticated — no /v1/login call will fire.
    const url = state.url;
    const isLoginPage = url.includes("/login/") || url.includes("/signup/") || url === LOGOUT_URL;
    if (!isLoginPage && !saving) {
      setAlreadyLoggedIn(true);
    } else {
      setAlreadyLoggedIn(false);
    }
  }, [saving]);

  function handleSignOutAndReconnect() {
    setAlreadyLoggedIn(false);
    setPageLoading(true);
    // Navigate to logout, which clears the session cookies, then redirect back to login
    webViewRef.current?.injectJavaScript(`
      fetch('https://www.mercari.com/v1/logout', { method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' } })
        .catch(function(){})
        .finally(function() { window.location.href = '${LOGIN_URL}'; });
      true;
    `);
  }

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.cancelBtn} hitSlop={8}>
          <Text style={s.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={s.title}>Connect Mercari</Text>
        <View style={s.cancelBtn} />
      </View>

      {error ? (
        <View style={s.errorBanner}>
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => setError("")}>
            <Text style={s.errorDismiss}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {saving ? (
        <View style={s.overlay}>
          <ActivityIndicator size="large" color="#ef4444" />
          <Text style={s.overlayText}>Connecting your Mercari account…</Text>
        </View>
      ) : (
        <WebView
          ref={webViewRef}
          source={{ uri: LOGIN_URL }}
          injectedJavaScriptBeforeContentLoaded={INTERCEPT_SCRIPT}
          onMessage={handleMessage}
          onLoadStart={() => setPageLoading(true)}
          onLoadEnd={() => setPageLoading(false)}
          onNavigationStateChange={handleNavigationStateChange}
          javaScriptEnabled
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          style={s.webview}
        />
      )}

      {pageLoading && !saving && (
        <View style={s.loadingOverlay}>
          <ActivityIndicator size="large" color="#ef4444" />
        </View>
      )}

      {/* Banner shown when user is already logged into Mercari via cached cookies */}
      {alreadyLoggedIn && !saving && (
        <View style={s.alreadyLoggedInBanner}>
          <Text style={s.alreadyLoggedInText}>
            You're already signed into Mercari. Sign out and sign back in to reconnect.
          </Text>
          <TouchableOpacity style={s.reconnectBtn} onPress={handleSignOutAndReconnect}>
            <Text style={s.reconnectBtnText}>Sign out & reconnect</Text>
          </TouchableOpacity>
        </View>
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
  webview: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    backgroundColor: "#fff",
  },
  overlayText: { fontSize: 15, color: "#52525b" },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fef2f2",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  errorText: { flex: 1, fontSize: 13, color: "#dc2626" },
  errorDismiss: { fontSize: 13, color: "#ef4444", fontWeight: "600" },
  alreadyLoggedInBanner: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e4e4e7",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  alreadyLoggedInText: { fontSize: 14, color: "#52525b", lineHeight: 20 },
  reconnectBtn: {
    backgroundColor: "#ef4444",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  reconnectBtnText: { fontSize: 15, fontWeight: "600", color: "#fff" },
});
