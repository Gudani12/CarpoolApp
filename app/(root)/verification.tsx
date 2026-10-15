import { useAuth, useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import CustomButton from "@/components/CustomButton";
import { fetchAPI } from "@/lib/fetch";
import {
  VerificationStatus,
  startDiditVerification,
} from "@/lib/verification";

type PassengerProfile = {
  id_verified?: boolean | null;
  id_number?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  date_of_birth?: string | null;
  rejection_reason?: string | null;
  didit_verified_at?: string | null;
  didit_session_id?: string | null;
};

const STATUS_BANNER: Record<
  VerificationStatus,
  {
    bg: string;
    tint: string;
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    body: string;
  }
> = {
  not_submitted: {
    bg: "#F0E6FA",
    tint: "#5A189A",
    icon: "shield-outline",
    title: "Verify your identity",
    body: "This takes about two minutes and only has to be done once.",
  },
  pending: {
    bg: "#FFF6E5",
    tint: "#D99A1B",
    icon: "time-outline",
    title: "We're reviewing your ID",
    body: "Most checks finish within a few minutes. We'll notify you either way.",
  },
  approved: {
    bg: "#F0E6FA",
    tint: "#5A189A",
    icon: "shield-checkmark",
    title: "You're verified",
    body: "Your identity is confirmed. You can start booking rides.",
  },
  rejected: {
    bg: "#FEF3F3",
    tint: "#B02A2A",
    icon: "alert-circle-outline",
    title: "We couldn't verify your ID",
    body: "Check the reason below and try again.",
  },
};

const Verification = () => {
  const { getToken } = useAuth();
  const { user } = useUser();

  const [status, setStatus] = useState<VerificationStatus>("not_submitted");
  const [profile, setProfile] = useState<PassengerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const result = await fetchAPI(
        `/(api)/profile?clerkId=${encodeURIComponent(user.id)}`,
      );
      const record = result?.data ?? {};
      setProfile(record);

      const nextStatus: VerificationStatus = record.id_verified
        ? "approved"
        : record.rejection_reason
          ? "rejected"
          : record.didit_session_id
            ? "pending"
            : "not_submitted";

      setStatus(nextStatus);
    } catch (error) {
      console.warn("Could not load verification status", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const startVerification = async () => {
    if (!user?.id || starting) return;

    setStarting(true);
    try {
      const token = await getToken();
      const session = await startDiditVerification(user.id);

      router.push({
        pathname: "/(root)/didit-webview",
        params: {
          url: session.url,
          sessionId: session.session_id,
          clerkId: user.id,
        },
      });
    } catch (err: any) {
      Alert.alert(
        "Verification",
        err?.message ?? "Please check your connection and try again.",
      );
    } finally {
      setStarting(false);
    }
  };

  const banner = STATUS_BANNER[status];
  const maskedId = profile?.id_number
    ? `•••• ${profile.id_number.slice(-4)}`
    : null;
  const fullName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    null;

  return (
    <SafeAreaView className="flex-1 bg-[#F7F4FB]">
      <View className="flex-row items-center gap-3 px-5 pb-2 pt-2">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          className="h-10 w-10 items-center justify-center rounded-xl border border-[#E9E2F0] bg-white active:opacity-70"
        >
          <Ionicons name="chevron-back" size={20} color="#21152F" />
        </Pressable>
        <Text className="text-[19px] font-JakartaExtraBold text-[#21152F]">
          Identity verification
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#5A189A" />
        </View>
      ) : (
        <ScrollView
          className="px-5"
          contentContainerStyle={{ paddingBottom: 48, paddingTop: 12 }}
          showsVerticalScrollIndicator={false}
        >
          <View
            className="mb-5 rounded-3xl p-5"
            style={{ backgroundColor: banner.bg }}
          >
            <Ionicons name={banner.icon} size={28} color={banner.tint} />
            <Text
              className="mt-3 text-[17px] font-JakartaExtraBold"
              style={{ color: banner.tint }}
            >
              {banner.title}
            </Text>
            <Text className="mt-1.5 text-[13px] font-Jakarta leading-5 text-[#746A7E]">
              {banner.body}
            </Text>

            {status === "rejected" && profile?.rejection_reason && (
              <View className="mt-3 rounded-2xl bg-white/70 px-3.5 py-3">
                <Text className="text-[11px] font-JakartaBold uppercase tracking-wider text-[#B02A2A]">
                  Reason
                </Text>
                <Text className="mt-1 text-[13px] font-JakartaMedium text-[#21152F]">
                  {profile.rejection_reason}
                </Text>
              </View>
            )}
          </View>

          {status === "approved" && (
            <View className="mb-5 rounded-3xl border border-[#E9E2F0] bg-white p-5">
              <Text className="mb-3 text-[14px] font-JakartaExtraBold text-[#21152F]">
                Verified details
              </Text>
              <View className="gap-2">
                {fullName && (
                  <View className="flex-row items-center justify-between">
                    <Text className="text-[13px] font-Jakarta text-[#746A7E]">
                      Name
                    </Text>
                    <Text className="text-[13px] font-JakartaBold text-[#21152F]">
                      {fullName}
                    </Text>
                  </View>
                )}
                {maskedId && (
                  <View className="flex-row items-center justify-between">
                    <Text className="text-[13px] font-Jakarta text-[#746A7E]">
                      ID number
                    </Text>
                    <Text className="text-[13px] font-JakartaBold text-[#21152F]">
                      {maskedId}
                    </Text>
                  </View>
                )}
                {profile?.date_of_birth && (
                  <View className="flex-row items-center justify-between">
                    <Text className="text-[13px] font-Jakarta text-[#746A7E]">
                      Date of birth
                    </Text>
                    <Text className="text-[13px] font-JakartaBold text-[#21152F]">
                      {profile.date_of_birth.slice(0, 10)}
                    </Text>
                  </View>
                )}
                {profile?.didit_verified_at && (
                  <View className="flex-row items-center justify-between">
                    <Text className="text-[13px] font-Jakarta text-[#746A7E]">
                      Verified on
                    </Text>
                    <Text className="text-[13px] font-JakartaBold text-[#21152F]">
                      {new Date(profile.didit_verified_at).toLocaleDateString()}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {status === "not_submitted" && (
            <>
              <View className="mb-5 rounded-3xl border border-[#E9E2F0] bg-white p-5">
                <Text className="mb-3 text-[15px] font-JakartaExtraBold text-[#21152F]">
                  How it works
                </Text>
                <View className="gap-3">
                  <StepRow
                    number={1}
                    title="Scan your ID"
                    body="Take a clear photo of your South African ID card or passport."
                  />
                  <StepRow
                    number={2}
                    title="Take a selfie"
                    body="We'll match your face to your ID to confirm it's you."
                  />
                  <StepRow
                    number={3}
                    title="Get verified"
                    body="Usually takes under a minute. We'll notify you when done."
                  />
                </View>
              </View>

              <CustomButton
                title={starting ? "Starting…" : "Start verification"}
                loading={starting}
                onPress={startVerification}
              />

              <View className="mt-4 flex-row gap-2.5 rounded-2xl border border-[#E9E2F0] bg-white p-4">
                <Ionicons
                  name="lock-closed-outline"
                  size={16}
                  color="#5A189A"
                />
                <Text className="flex-1 text-[11.5px] font-Jakarta leading-4 text-[#746A7E]">
                  Your documents are encrypted and processed by Didit, our
                  identity verification partner. We never see the raw images.
                </Text>
              </View>
            </>
          )}

          {status === "rejected" && (
            <CustomButton
              title={starting ? "Starting…" : "Try again"}
              loading={starting}
              onPress={startVerification}
            />
          )}

          {status === "pending" && (
            <View className="rounded-2xl border border-[#E9E2F0] bg-white p-4">
              <View className="flex-row items-center gap-2">
                <ActivityIndicator size="small" color="#5A189A" />
                <Text className="flex-1 text-[13px] font-JakartaMedium text-[#746A7E]">
                  Checking with Didit. This usually finishes in under a minute.
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

function StepRow({
  number,
  title,
  body,
}: {
  number: number;
  title: string;
  body: string;
}) {
  return (
    <View className="flex-row items-start gap-3">
      <View className="h-7 w-7 items-center justify-center rounded-full bg-[#F0E6FA]">
        <Text className="text-[12px] font-JakartaBold text-[#5A189A]">
          {number}
        </Text>
      </View>
      <View className="flex-1">
        <Text className="text-[13.5px] font-JakartaBold text-[#21152F]">
          {title}
        </Text>
        <Text className="mt-0.5 text-[12px] font-Jakarta leading-4 text-[#746A7E]">
          {body}
        </Text>
      </View>
    </View>
  );
}

export default Verification;