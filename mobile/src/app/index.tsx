import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { fetchSaves, type Save, saveLink, type SaveLinkResult } from "@/lib/saves";
import { isSupabaseConfigured } from "@/lib/supabase";

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "loaded"; saves: Save[] };

async function loadSaves(): Promise<State> {
  try {
    return { kind: "loaded", saves: await fetchSaves() };
  } catch (err) {
    return { kind: "error", message: err instanceof Error ? err.message : String(err) };
  }
}

export default function LibraryScreen() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    loadSaves().then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    setState(await loadSaves());
    setRefreshing(false);
  };

  // Put the saved item at the top (replacing it if it was already in the list, e.g. after a retry).
  const onSaved = ({ save }: SaveLinkResult) =>
    setState((current) =>
      current.kind === "loaded"
        ? { kind: "loaded", saves: [save, ...current.saves.filter((s) => s.id !== save.id)] }
        : current
    );

  if (!isSupabaseConfigured) {
    return (
      <Message
        title="Database not connected yet"
        body="Copy mobile/.env.example to mobile/.env, add your Supabase URL and key, then restart the app."
      />
    );
  }
  if (state.kind === "loading") {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }
  if (state.kind === "error") {
    return <Message title="Couldn't load your library" body={state.message} />;
  }

  return (
    <View style={styles.screen}>
      <PasteLinkBox onSaved={onSaved} />
      <FlatList
        data={state.saves}
        keyExtractor={(save) => save.id}
        renderItem={({ item }) => <SaveRow save={item} />}
        onRefresh={refresh}
        refreshing={refreshing}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={state.saves.length === 0 ? styles.center : styles.list}
        ListEmptyComponent={<Message title="No saves yet" body="Paste a link above to save your first inspiration." />}
      />
    </View>
  );
}

function PasteLinkBox({ onSaved }: { onSaved: (result: SaveLinkResult) => void }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; isError: boolean } | null>(null);

  const onSave = async () => {
    if (!url.trim()) return;
    setBusy(true);
    setFeedback(null);
    try {
      const result = await saveLink(url);
      onSaved(result);
      setUrl("");
      setFeedback({
        text: !result.created
          ? "Already in your library"
          : result.save.status === "failed"
          ? "Saved, but its details couldn't be read"
          : "Saved ✓",
        isError: false,
      });
    } catch (err) {
      setFeedback({ text: err instanceof Error ? err.message : String(err), isError: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.pasteBox}>
      <View style={styles.pasteRow}>
        <TextInput
          style={styles.input}
          placeholder="Paste a link"
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          editable={!busy}
          onSubmitEditing={onSave}
        />
        <Pressable
          accessibilityRole="button"
          onPress={onSave}
          disabled={busy || !url.trim()}
          style={[styles.button, (busy || !url.trim()) && styles.buttonInactive]}
        >
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save</Text>}
        </Pressable>
      </View>
      {feedback ? <Text style={feedback.isError ? styles.error : styles.feedback}>{feedback.text}</Text> : null}
    </View>
  );
}

function SaveRow({ save }: { save: Save }) {
  return (
    <View style={styles.card} testID="save-row">
      <Text style={styles.title}>{save.title ?? save.url}</Text>
      {save.description ? <Text style={styles.description}>{save.description}</Text> : null}
      <Text style={styles.meta}>
        {save.source} · {new Date(save.created_at).toLocaleDateString()} · {save.status}
      </Text>
      <Text style={styles.url} numberOfLines={1}>
        {save.url}
      </Text>
      {save.status === "failed" && save.processing_error
        ? <Text style={styles.meta}>{save.processing_error}</Text>
        : null}
    </View>
  );
}

function Message({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.center}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.messageBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  pasteBox: { padding: 16, paddingBottom: 4, gap: 6 },
  pasteRow: { flexDirection: "row", gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: "#ccc", borderRadius: 10, paddingHorizontal: 12, fontSize: 16 },
  button: { backgroundColor: "#1a5fb4", borderRadius: 10, paddingHorizontal: 18, justifyContent: "center" },
  buttonInactive: { opacity: 0.5 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  feedback: { fontSize: 14, color: "#26a269" },
  error: { fontSize: 14, color: "#c01c28" },
  center: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 },
  list: { padding: 16, gap: 12 },
  card: { padding: 16, borderRadius: 12, backgroundColor: "#f2f2f2", gap: 4 },
  title: { fontSize: 17, fontWeight: "600", textAlign: "left" },
  description: { fontSize: 15, color: "#333" },
  meta: { fontSize: 13, color: "#666" },
  url: { fontSize: 13, color: "#1a5fb4" },
  messageBody: { fontSize: 15, color: "#555", textAlign: "center" },
});
