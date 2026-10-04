import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { looksLikeEmail, sendCode, verifyCode } from "@/lib/auth";

type Step = "email" | "code";

export default function SignInScreen() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const onSendCode = () => {
    if (!looksLikeEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    run(async () => {
      await sendCode(email);
      setStep("code");
    });
  };

  // On success the session changes and the app switches to the library by itself.
  const onVerify = () => run(() => verifyCode(email, code));

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Sign in</Text>

      {step === "email"
        ? (
          <>
            <Text style={styles.body}>{"We'll email you a code. No password needed."}</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              editable={!busy}
              onSubmitEditing={onSendCode}
            />
            <Button label="Send code" onPress={onSendCode} busy={busy} />
          </>
        )
        : (
          <>
            <Text style={styles.body}>Enter the code we sent to {email.trim()}.</Text>
            <TextInput
              style={styles.input}
              placeholder="Code from the email"
              value={code}
              onChangeText={(text) => setCode(text.replace(/\D/g, ""))}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              maxLength={10}
              editable={!busy}
              onSubmitEditing={onVerify}
            />
            <Button label="Sign in" onPress={onVerify} busy={busy} disabled={code.length < 6} />
            <Pressable
              onPress={() => {
                setStep("email");
                setCode("");
                setError(null);
              }}
              disabled={busy}
            >
              <Text style={styles.link}>Use a different email</Text>
            </Pressable>
          </>
        )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function Button({ label, onPress, busy, disabled }: {
  label: string;
  onPress: () => void;
  busy: boolean;
  disabled?: boolean;
}) {
  const inactive = busy || disabled;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={inactive}
      style={[styles.button, inactive && styles.buttonInactive]}
    >
      {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12, justifyContent: "center" },
  heading: { fontSize: 28, fontWeight: "700" },
  body: { fontSize: 16, color: "#444" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 10, padding: 14, fontSize: 17 },
  button: { backgroundColor: "#1a5fb4", borderRadius: 10, padding: 14, alignItems: "center" },
  buttonInactive: { opacity: 0.5 },
  buttonText: { color: "#fff", fontSize: 17, fontWeight: "600" },
  link: { color: "#1a5fb4", fontSize: 15, textAlign: "center", padding: 8 },
  error: { color: "#c01c28", fontSize: 15 },
});
