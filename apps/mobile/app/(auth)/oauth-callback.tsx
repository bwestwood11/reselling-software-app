import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/contexts/AuthContext";

export default function OAuthCallbackScreen() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (user) {
      router.replace("/(tabs)");
      return;
    }

    // If callback lands without an authenticated session, send user back to login.
    router.replace("/(auth)/login");
  }, [isLoading, user, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#1d4ed8" />
      <Text style={styles.text}>Finishing Google sign in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    paddingHorizontal: 24,
  },
  text: {
    marginTop: 14,
    color: "#374151",
    fontSize: 14,
  },
});
