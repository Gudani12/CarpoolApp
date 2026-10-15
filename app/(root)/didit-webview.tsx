import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

const DiditWebView = () => {
    const params = useLocalSearchParams<{ url?: string }>();
    const url = typeof params.url === "string" ? params.url : null;
    const [loading, setLoading] = useState(true);

    if (!url) {
        return (
            <SafeAreaView className="flex-1 items-center justify-center bg-[#F7F4FB] px-6">
                <Text className="text-center text-[15px] font-JakartaBold text-[#21152F]">
                    Could not open verification
                </Text>
                <Pressable
                    onPress={() => router.back()}
                    className="mt-6 rounded-2xl bg-[#5A189A] px-6 py-3"
                >
                    <Text className="text-[14px] font-JakartaBold text-white">
                        Go back
                    </Text>
                </Pressable>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-[#F7F4FB]">
            <View className="flex-row items-center justify-between px-4 pb-3 pt-2">
                <Text className="text-[16px] font-JakartaExtraBold text-[#21152F]">
                    Verify your identity
                </Text>
                <Pressable
                    onPress={() => router.back()}
                    className="h-10 w-10 items-center justify-center rounded-full bg-white active:opacity-70"
                >
                    <Ionicons name="close" size={20} color="#21152F" />
                </Pressable>
            </View>
            <View className="flex-1 overflow-hidden">
                {loading && (
                    <View className="absolute inset-0 z-10 items-center justify-center bg-[#F7F4FB]">
                        <ActivityIndicator size="large" color="#5A189A" />
                    </View>
                )}
                <WebView
                    source={{ uri: url }}
                    onLoadStart={() => setLoading(true)}
                    onLoadEnd={() => setLoading(false)}
                    mediaPlaybackRequiresUserAction={false}
                    allowsInlineMediaPlayback
                    javaScriptEnabled
                    domStorageEnabled
                    originWhitelist={["*"]}
                />
            </View>
        </SafeAreaView>
    );
};

export default DiditWebView;