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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "../../src/contexts/AuthContext";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const { verifyEmail, resendVerificationOtp } = useAuth();

  const email = emailParam ?? "";
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const otpRef = useRef<TextInput>(null);

  async function handleVerify() {
    if (otp.length !== 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }

    setError(null);
    setNotice(null);
    setIsVerifying(true);

    try {
      await verifyEmail(email, otp);
      // AuthContext update triggers root layout redirect to (tabs)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleResend() {
    setError(null);
    setNotice(null);
    setIsResending(true);

    try {
      await resendVerificationOtp(email);
      setNotice("A new code has been sent to your email.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend code.");
    } finally {
      setIsResending(false);
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
          <View style={styles.brand}>
            <View style={styles.logoWrap}>
              <Feather name="mail" size={28} color="#fff" />
            </View>
            <Text style={styles.appName}>Verify your email</Text>
            <Text style={styles.tagline}>
              {email ? `Enter the code sent to ${email}` : "Enter the code sent to your email"}
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.heading}>Verification code</Text>
            <Text style={styles.subheading}>The code expires in 10 minutes.</Text>

            <View style={styles.fieldWrap}>
              <TextInput
                ref={otpRef}
                style={styles.otpInput}
                placeholder="123456"
                placeholderTextColor="#9ca3af"
                keyboardType="number-pad"
                maxLength={6}
                autoComplete="one-time-code"
                textAlign="center"
                value={otp}
                onChangeText={(t) => {
                  setOtp(t.replace(/\D/g, ""));
                  setError(null);
                }}
                onSubmitEditing={handleVerify}
              />
            </View>

            {error && (
              <View style={styles.errorWrap}>
                <Feather name="alert-circle" size={14} color="#dc2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
            {notice && (
              <View style={styles.noticeWrap}>
                <Feather name="check-circle" size={14} color="#2563eb" />
                <Text style={styles.noticeText}>{notice}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.primaryBtn, (isVerifying || otp.length !== 6) && styles.btnDisabled]}
              onPress={handleVerify}
              disabled={isVerifying || otp.length !== 6}
              activeOpacity={0.85}
            >
              {isVerifying ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>Verify email</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryBtn, isResending && styles.btnDisabled]}
              onPress={handleResend}
              disabled={isResending || !email}
              activeOpacity={0.85}
            >
              {isResending ? (
                <ActivityIndicator color="#ea580c" size="small" />
              ) : (
                <Text style={styles.secondaryBtnText}>Resend code</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Wrong email? </Text>
            <TouchableOpacity onPress={() => router.replace("/(auth)/register")}>
              <Text style={styles.footerLink}>Start over</Text>
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
    fontSize: 22,
    fontWeight: "800",
    color: "#09090b",
    letterSpacing: -0.3,
    textAlign: "center",
  },
  tagline: {
    fontSize: 14,
    color: "#71717a",
    marginTop: 6,
    fontWeight: "500",
    textAlign: "center",
    paddingHorizontal: 12,
  },

  form: {
    backgroundColor: "#fafafa",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#f4f4f5",
    marginBottom: 24,
  },
  heading: {
    fontSize: 18,
    fontWeight: "700",
    color: "#09090b",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  subheading: {
    fontSize: 13,
    color: "#71717a",
    marginBottom: 20,
  },

  fieldWrap: { marginBottom: 16 },
  otpInput: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#e4e4e7",
    borderRadius: 12,
    paddingVertical: 16,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 10,
    color: "#09090b",
  },

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

  noticeWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#eff6ff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  noticeText: { flex: 1, color: "#2563eb", fontSize: 13, lineHeight: 18 },

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
    marginBottom: 12,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  secondaryBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#e4e4e7",
  },
  secondaryBtnText: { color: "#ea580c", fontWeight: "700", fontSize: 15 },

  btnDisabled: { opacity: 0.55 },

  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: { fontSize: 14, color: "#71717a" },
  footerLink: { fontSize: 14, color: "#ea580c", fontWeight: "700" },
});
