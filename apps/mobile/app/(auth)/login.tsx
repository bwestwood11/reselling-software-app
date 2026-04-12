import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/contexts/AuthContext";

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignIn() {
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await signIn(email.trim(), password);
      // AuthContext update triggers root layout redirect to (tabs)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.inner}>
        {/* Brand */}
        <View style={styles.brand}>
          <Text style={styles.brandIcon}>🛍</Text>
          <Text style={styles.brandName}>ReList</Text>
        </View>
        <Text style={styles.subtitle}>Sign in to your account</Text>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome back</Text>
          <Text style={styles.cardSub}>Enter your credentials to continue</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Sign in</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          Don&apos;t have an account?{" "}
          <Text
            style={styles.link}
            onPress={() => router.replace("/(auth)/register")}
          >
            Create one
          </Text>
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  inner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 6,
  },
  brandIcon: { fontSize: 28 },
  brandName: { fontSize: 26, fontWeight: "700", color: "#1d4ed8" },
  subtitle: {
    textAlign: "center",
    color: "#6b7280",
    fontSize: 14,
    marginBottom: 28,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  cardSub: { fontSize: 13, color: "#6b7280", marginBottom: 20 },
  field: { marginBottom: 16 },
  label: {
    fontSize: 13,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#fafafa",
  },
  errorBox: {
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  errorText: { color: "#dc2626", fontSize: 13 },
  button: {
    backgroundColor: "#1d4ed8",
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  footer: { textAlign: "center", color: "#6b7280", fontSize: 13 },
  link: { color: "#1d4ed8", fontWeight: "600" },
});
