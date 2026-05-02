import { Stack } from "expo-router";

export default function ListingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#fbfaf8" },
        headerTintColor: "#ea580c",
        headerTitleStyle: { fontWeight: "700", color: "#111827" },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Listings" }} />
      <Stack.Screen
        name="new"
        options={{ title: "New Listing", presentation: "modal" }}
      />
    </Stack>
  );
}
