import { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "../../src/contexts/AuthContext";
import { AuthApiError } from "../../src/lib/auth";

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, signInWithGoogle } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const passwordRef = useRef<TextInput>(null);

  async function handleSignIn() {
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await signIn(email.trim(), password);
      router.replace("/(tabs)");
    } catch (err) {
      if (err instanceof AuthApiError && err.code === "EMAIL_NOT_VERIFIED") {
        // A fresh code was just emailed (emailVerification.sendOnSignIn).
        router.push({ pathname: "/(auth)/verify-email", params: { email: email.trim() } });
        return;
      }
      setError(err instanceof Error ? err.message : "Sign in failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    setIsLoading(true);
    try {
      await signInWithGoogle();
      router.replace("/(tabs)");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign in failed.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Brand mark ─────────────────────────────── */}
          <View style={styles.brand}>
            <View style={styles.logoWrap}>
              <Feather name="shopping-bag" size={28} color="#fff" />
            </View>
            <Text style={styles.appName}>ReList</Text>
            <Text style={styles.tagline}>Sell more. Everywhere.</Text>
          </View>

          {/* ── Form ───────────────────────────────────── */}
          <View style={styles.form}>
            <Text style={styles.heading}>Welcome back</Text>
            <Text style={styles.subheading}>Sign in to your account</Text>

            {/* Email */}
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Email address</Text>
              <View
                style={[
                  styles.inputWrap,
                  focusedField === "email" && styles.inputWrapFocused,
                  error && !email.trim() && styles.inputWrapError,
                ]}
              >
                <Feather
                  name="mail"
                  size={16}
                  color={focusedField === "email" ? "#ea580c" : "#9ca3af"}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor="#9ca3af"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  returnKeyType="next"
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    setError(null);
                  }}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.fieldWrap}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Password</Text>
                <TouchableOpacity>
                  <Text style={styles.forgotLink}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
              <View
                style={[
                  styles.inputWrap,
                  focusedField === "password" && styles.inputWrapFocused,
                  error && !password && styles.inputWrapError,
                ]}
              >
                <Feather
                  name="lock"
                  size={16}
                  color={focusedField === "password" ? "#ea580c" : "#9ca3af"}
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={passwordRef}
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={!showPassword}
                  autoComplete="current-password"
                  returnKeyType="done"
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    setError(null);
                  }}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  onSubmitEditing={handleSignIn}
                />
                <Pressable
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={8}
                  style={styles.eyeBtn}
                >
                  <Feather
                    name={showPassword ? "eye-off" : "eye"}
                    size={16}
                    color="#9ca3af"
                  />
                </Pressable>
              </View>
            </View>

            {/* Error */}
            {error && (
              <View style={styles.errorWrap}>
                <Feather name="alert-circle" size={14} color="#dc2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Sign in */}
            <TouchableOpacity
              style={[styles.primaryBtn, isLoading && styles.btnDisabled]}
              onPress={handleSignIn}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>Sign in</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google */}
            <TouchableOpacity
              style={[styles.googleBtn, isLoading && styles.btnDisabled]}
              onPress={handleGoogleSignIn}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <View style={styles.googleIcon}>
                <Text style={styles.googleIconText}>G</Text>
              </View>
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </TouchableOpacity>
          </View>

          {/* ── Footer ─────────────────────────────────── */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>New to ReList? </Text>
            <TouchableOpacity onPress={() => router.replace("/(auth)/register")}>
              <Text style={styles.footerLink}>Create an account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  kav: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },

  // Brand
  brand: { alignItems: "center", marginBottom: 40, marginTop: 8 },
  logoWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#ea580c",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    shadowColor: "#ea580c",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  appName: {
    fontSize: 28,
    fontWeight: "800",
    color: "#09090b",
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    color: "#71717a",
    marginTop: 4,
    fontWeight: "500",
  },

  // Form
  form: {
    backgroundColor: "#fafafa",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#f4f4f5",
    marginBottom: 24,
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    color: "#09090b",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  subheading: {
    fontSize: 14,
    color: "#71717a",
    marginBottom: 24,
  },

  // Fields
  fieldWrap: { marginBottom: 16 },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3f3f46",
    marginBottom: 6,
  },
  forgotLink: {
    fontSize: 12,
    color: "#ea580c",
    fontWeight: "600",
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#e4e4e7",
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputWrapFocused: {
    borderColor: "#ea580c",
    shadowColor: "#ea580c",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  inputWrapError: { borderColor: "#ef4444" },
  inputIcon: { marginRight: 8 },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#09090b",
    paddingVertical: Platform.OS === "ios" ? 14 : 11,
  },
  eyeBtn: { padding: 4 },

  // Error
  errorWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fef2f2",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorText: { flex: 1, color: "#dc2626", fontSize: 13, lineHeight: 18 },

  // Buttons
  primaryBtn: {
    backgroundColor: "#ea580c",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    shadowColor: "#ea580c",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  btnDisabled: { opacity: 0.55 },

  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 18,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#e4e4e7" },
  dividerText: { fontSize: 12, color: "#a1a1aa", fontWeight: "500" },

  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e4e4e7",
    paddingVertical: 13,
  },
  googleIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#4285F4",
    alignItems: "center",
    justifyContent: "center",
  },
  googleIconText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 14,
  },
  googleBtnText: { color: "#3f3f46", fontWeight: "600", fontSize: 15 },

  // Footer
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: { fontSize: 14, color: "#71717a" },
  footerLink: { fontSize: 14, color: "#ea580c", fontWeight: "700" },
});
