import { ClerkLoaded, ClerkProvider, useAuth } from "@clerk/expo";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  LogBox,
  Pressable,
  Text,
  View,
} from "react-native";
import "react-native-reanimated";
import "../global.css";

import AnimatedSplash from "@/components/AnimatedSplash";
import { API_ORIGIN } from "@/constants/api";
import { tokenCache } from "@/lib/auth";
import { setFetchTokenProvider } from "@/lib/fetch";
import { setRuntimeAppConfig } from "@/lib/runtimeConfig";
import { configureSupabaseClient } from "@/lib/supabase";

// Prevent the splash screen from auto-hiding before asset loading is complete.
// The catch matters: in Expo Go and after a Fast Refresh there may be no native
// splash registered, and the rejected promise surfaces as a red-box error.
SplashScreen.preventAutoHideAsync().catch(() => { });

LogBox.ignoreLogs(["Clerk:"]);

// ─────────────────────────────────────────────────────────────────────────────
// TokenBridge wires the Clerk token into fetchAPI so every backend request
// automatically includes the Authorization: Bearer header.
// ─────────────────────────────────────────────────────────────────────────────
function TokenBridge() {
  const { getToken } = useAuth();

  useEffect(() => {
    setFetchTokenProvider(async () => {
      try {
        return (await getToken()) ?? null;
      } catch {
        return null;
      }
    });
    return () => setFetchTokenProvider(null);
  }, [getToken]);

  return null;
}

export default function RootLayout() {
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [configAttempt, setConfigAttempt] = useState(0);
  const [loaded] = useFonts({
    "Jakarta-Bold": require("../assets/fonts/PlusJakartaSans-Bold.ttf"),
    "Jakarta-ExtraBold": require("../assets/fonts/PlusJakartaSans-ExtraBold.ttf"),
    "Jakarta-ExtraLight": require("../assets/fonts/PlusJakartaSans-ExtraLight.ttf"),
    "Jakarta-Light": require("../assets/fonts/PlusJakartaSans-Light.ttf"),
    "Jakarta-Medium": require("../assets/fonts/PlusJakartaSans-Medium.ttf"),
    Jakarta: require("../assets/fonts/PlusJakartaSans-Regular.ttf"),
    "Jakarta-SemiBold": require("../assets/fonts/PlusJakartaSans-SemiBold.ttf"),
  });

  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadAppConfig = async () => {
      setConfigError(null);
      try {
        const response = await fetch(`${API_ORIGIN}/api/app-config`);
        const body = await response.json();
        if (!response.ok) {
          throw new Error(
            typeof body?.error === "string"
              ? body.error
              : `App configuration request failed (${response.status})`,
          );
        }
        if (
          typeof body?.clerkPublishableKey !== "string" ||
          !/^pk_(test|live)_[A-Za-z0-9]+\$?$/.test(body.clerkPublishableKey) ||
          typeof body?.supabaseUrl !== "string" ||
          typeof body?.supabasePublishableKey !== "string" ||
          typeof body?.googleMapsApiKey !== "string" ||
          typeof body?.directionsApiKey !== "string" ||
          typeof body?.geoapifyApiKey !== "string" ||
          typeof body?.stripePublishableKey !== "string"
        ) {
          throw new Error("Render returned invalid app configuration");
        }
        if (isMounted) {
          setRuntimeAppConfig({
            clerkPublishableKey: body.clerkPublishableKey,
            supabaseUrl: body.supabaseUrl,
            supabasePublishableKey: body.supabasePublishableKey,
            googleMapsApiKey: body.googleMapsApiKey,
            directionsApiKey: body.directionsApiKey,
            geoapifyApiKey: body.geoapifyApiKey,
            stripePublishableKey: body.stripePublishableKey,
          });
          configureSupabaseClient(
            body.supabaseUrl,
            body.supabasePublishableKey,
          );
          setPublishableKey(body.clerkPublishableKey);
        }
      } catch (error) {
        if (isMounted) {
          setConfigError(
            error instanceof Error
              ? error.message
              : "Unable to load app configuration",
          );
        }
      }
    };

    void loadAppConfig();
    return () => {
      isMounted = false;
    };
  }, [configAttempt]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync().catch(() => { });
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  const content = publishableKey ? (
    <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
      <ClerkLoaded>
        <TokenBridge />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(root)" />
          <Stack.Screen name="+not-found" />
        </Stack>
      </ClerkLoaded>
    </ClerkProvider>
  ) : configError ? (
    <View className="flex-1 items-center justify-center bg-[#1d1135] px-8">
      <Text className="mb-4 text-center text-white">
        Could not load app configuration: {configError}
      </Text>
      <Pressable
        className="rounded-xl bg-white px-5 py-3"
        onPress={() => setConfigAttempt((attempt) => attempt + 1)}
      >
        <Text className="font-semibold text-[#1d1135]">Retry</Text>
      </Pressable>
    </View>
  ) : (
    <View className="flex-1 items-center justify-center bg-[#1d1135]">
      <ActivityIndicator color="#ffffff" />
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      {content}
      {!splashDone && <AnimatedSplash onFinish={() => setSplashDone(true)} />}
    </View>
  );
}