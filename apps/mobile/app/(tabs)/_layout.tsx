import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Platform, View } from "react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#ea580c",
        tabBarInactiveTintColor: "#a1a1aa",
        tabBarStyle: {
          backgroundColor: "#fbfaf8",
          borderTopColor: "#e4e4e7",
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 84 : 64,
          paddingBottom: Platform.OS === "ios" ? 24 : 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <Feather name="grid" size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: "Inventory",
          tabBarIcon: ({ color, size }) => (
            <Feather name="package" size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="listings"
        options={{
          title: "Listings",
          tabBarIcon: ({ color, size }) => (
            <Feather name="tag" size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="marketplaces"
        options={{
          title: "Markets",
          tabBarIcon: ({ color, size }) => (
            <Feather name="shopping-bag" size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Feather name="settings" size={size - 2} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
