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

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  function validate() {
    if (!name.trim()) return "Please enter your full name.";
    if (!email.trim()) return "Please enter your email address.";
    if (!email.includes("@")) return "Please enter a valid email address.";
    if (!password) return "Please enter a password.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    return null;
  }

  async function handleRegister() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const requiresVerification = await signUp(name.trim(), email.trim(), password);
      if (requiresVerification) {
        router.push({ pathname: "/(auth)/verify-email", params: { email: email.trim() } });
        return;
      }
      // AuthContext update triggers root layout redirect to (tabs)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
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
            <Text style={styles.tagline}>Start cross-listing today</Text>
          </View>

          {/* ── Form ───────────────────────────────────── */}
          <View style={styles.form}>
            <Text style={styles.heading}>Create your account</Text>
            <Text style={styles.subheading}>
              Free to start — no credit card required
            </Text>

            {/* Full name */}
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Full name</Text>
              <View
                style={[
                  styles.inputWrap,
                  focusedField === "name" && styles.inputWrapFocused,
                ]}
              >
                <Feather
                  name="user"
                  size={16}
                  color={focusedField === "name" ? "#ea580c" : "#9ca3af"}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Jane Doe"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="words"
                  autoCorrect={false}
                  autoComplete="name"
                  returnKeyType="next"
                  value={name}
                  onChangeText={(t) => {
                    setName(t);
                    setError(null);
                  }}
                  onFocus={() => setFocusedField("name")}
                  onBlur={() => setFocusedField(null)}
                  onSubmitEditing={() => emailRef.current?.focus()}
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Email address</Text>
              <View
                style={[
                  styles.inputWrap,
                  focusedField === "email" && styles.inputWrapFocused,
                ]}
              >
                <Feather
                  name="mail"
                  size={16}
                  color={focusedField === "email" ? "#ea580c" : "#9ca3af"}
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={emailRef}
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
              <Text style={styles.label}>Password</Text>
              <View
                style={[
                  styles.inputWrap,
                  focusedField === "password" && styles.inputWrapFocused,
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
                  placeholder="Min. 8 characters"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
                  returnKeyType="done"
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    setError(null);
                  }}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  onSubmitEditing={handleRegister}
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
              {password.length > 0 && (
                <PasswordStrength password={password} />
              )}
            </View>

            {/* Error */}
            {error && (
              <View style={styles.errorWrap}>
                <Feather name="alert-circle" size={14} color="#dc2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Submit */}
            <TouchableOpacity
              style={[styles.primaryBtn, isLoading && styles.btnDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>Create account</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.terms}>
              By creating an account you agree to our{" "}
              <Text style={styles.termsLink}>Terms of Service</Text> and{" "}
              <Text style={styles.termsLink}>Privacy Policy</Text>.
            </Text>
          </View>

          {/* ── Footer ─────────────────────────────────── */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
              <Text style={styles.footerLink}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const hasLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const score = [hasLength, hasNumber, hasSpecial].filter(Boolean).length;

  const bars = [
    score >= 1 ? (score === 1 ? "#ef4444" : score === 2 ? "#f59e0b" : "#22c55e") : "#e4e4e7",
    score >= 2 ? (score === 2 ? "#f59e0b" : "#22c55e") : "#e4e4e7",
    score >= 3 ? "#22c55e" : "#e4e4e7",
  ];

  const label = score === 0 ? "" : score === 1 ? "Weak" : score === 2 ? "Fair" : "Strong";
  const labelColor = score === 1 ? "#ef4444" : score === 2 ? "#f59e0b" : "#22c55e";

  return (
    <View style={strength.wrap}>
      <View style={strength.bars}>
        {bars.map((color, i) => (
          <View key={i} style={[strength.bar, { backgroundColor: color }]} />
        ))}
      </View>
      {label ? <Text style={[strength.label, { color: labelColor }]}>{label}</Text> : null}
    </View>
  );
}

const strength = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  bars: { flex: 1, flexDirection: "row", gap: 4 },
  bar: { flex: 1, height: 3, borderRadius: 2 },
  label: { fontSize: 11, fontWeight: "600", minWidth: 36, textAlign: "right" },
});

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
  brand: { alignItems: "center", marginBottom: 36, marginTop: 8 },
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
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3f3f46",
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
    marginBottom: 14,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  btnDisabled: { opacity: 0.55 },

  terms: {
    fontSize: 11,
    color: "#a1a1aa",
    textAlign: "center",
    lineHeight: 16,
  },
  termsLink: { color: "#71717a", fontWeight: "600" },

  // Footer
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: { fontSize: 14, color: "#71717a" },
  footerLink: { fontSize: 14, color: "#ea580c", fontWeight: "700" },
});
