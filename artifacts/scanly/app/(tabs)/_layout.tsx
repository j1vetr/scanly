import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

type MCIconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];
type IOIconName = React.ComponentProps<typeof Ionicons>["name"];

function TabIcon({
  focused,
  color,
  size,
  activeIcon,
  inactiveIcon,
  library,
}: {
  focused: boolean;
  color: string;
  size: number;
  activeIcon: MCIconName | IOIconName;
  inactiveIcon: MCIconName | IOIconName;
  library: "mc" | "io";
}) {
  const iconName = focused ? activeIcon : inactiveIcon;
  if (library === "io") {
    return <Ionicons name={iconName as IOIconName} size={size} color={color} />;
  }
  return <MaterialCommunityIcons name={iconName as MCIconName} size={size} color={color} />;
}

export default function TabLayout() {
  const colors = useColors();
  const safeAreaInsets = useSafeAreaInsets();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: 0,
          elevation: 0,
          paddingBottom: safeAreaInsets.bottom,
          height: isWeb ? 84 : 60 + safeAreaInsets.bottom,
          shadowColor: colors.secondary,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 10,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: "Inter_500Medium",
          marginBottom: 2,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint="light"
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Ana Sayfa",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              focused={focused}
              color={color}
              size={24}
              library="mc"
              activeIcon="home"
              inactiveIcon="home-outline"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "Tara",
          tabBarStyle: { display: "none" },
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              focused={focused}
              color={color}
              size={24}
              library="mc"
              activeIcon="line-scan"
              inactiveIcon="line-scan"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="dosyalar"
        options={{
          title: "Dosyalar",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              focused={focused}
              color={color}
              size={24}
              library="mc"
              activeIcon="folder"
              inactiveIcon="folder-outline"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="ara"
        options={{
          title: "Ara",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              focused={focused}
              color={color}
              size={24}
              library="io"
              activeIcon="search"
              inactiveIcon="search-outline"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="ayarlar"
        options={{
          title: "Ayarlar",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              focused={focused}
              color={color}
              size={24}
              library="io"
              activeIcon="settings"
              inactiveIcon="settings-outline"
            />
          ),
        }}
      />
    </Tabs>
  );
}
