import { Stack } from "expo-router";

export default function InventoryLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#fbfaf8" },
        headerTintColor: "#ea580c",
        headerTitleStyle: { fontWeight: "700", color: "#111827" },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Inventory" }} />
      <Stack.Screen
        name="new"
        options={{ title: "Add Item", presentation: "modal" }}
      />
      <Stack.Screen name="[id]" options={{ title: "Item Details" }} />
    </Stack>
  );
}
