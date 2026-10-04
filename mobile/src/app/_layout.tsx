import { Stack } from "expo-router";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";

import { signOut, useSession } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";

export default function RootLayout() {
  const session = useSession();

  if (session === undefined) {
    // Still checking whether a login is saved on this phone.
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  // Without a database connection the library screen explains how to set it up.
  const showLibrary = Boolean(session) || !isSupabaseConfigured;

  return (
    <Stack>
      <Stack.Protected guard={showLibrary}>
        <Stack.Screen
          name="index"
          options={{ title: "Inspiration Library", headerRight: session ? () => <SignOutButton /> : undefined }}
        />
      </Stack.Protected>
      <Stack.Protected guard={!showLibrary}>
        <Stack.Screen name="sign-in" options={{ title: "Inspiration Library" }} />
      </Stack.Protected>
    </Stack>
  );
}

function SignOutButton() {
  const onPress = () =>
    signOut().catch((err) => Alert.alert("Couldn't sign out", err instanceof Error ? err.message : String(err)));
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8}>
      <Text style={{ color: "#1a5fb4", fontSize: 16 }}>Sign out</Text>
    </Pressable>
  );
}
