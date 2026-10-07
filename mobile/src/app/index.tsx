import { useShareIntentContext } from "expo-share-intent";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { fetchSaves, type Save, saveLink, type SaveLinkResult } from "@/lib/saves";
import { isSupabaseConfigured } from "@/lib/supabase";

type Feedback = { text: string; isError: boolean };

/** What to tell the user after a save. */
export function savedMessage({ created, save }: SaveLinkResult): string {
  if (!created) return "Already in your library";
  if (save.status === "failed") return "Saved, but its details couldn't be read";
  return "Saved ✓";
}

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
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();

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

  /** Save a link (typed or shared) and put it at the top of the list. Returns true on success. */
  const save = async (url: string): Promise<boolean> => {
    setSaving(true);
    setFeedback(null);
    try {
      const result = await saveLink(url);
      setState((current) =>
        current.kind === "loaded"
          ? { kind: "loaded", saves: [result.save, ...current.saves.filter((s) => s.id !== result.save.id)] }
          : current
      );
      setFeedback({ text: savedMessage(result), isError: false });
      return true;
    } catch (err) {
      setFeedback({ text: err instanceof Error ? err.message : String(err), isError: true });
      return false;
    } finally {
      setSaving(false);
    }
  };

  // A link shared into the app from another app's Share menu: save it once the library has loaded.
  // (If the user wasn't signed in, this screen only appears after sign-in, so the share waits until then.)
  const libraryLoaded = state.kind === "loaded";
  const handledShare = useRef<string | null>(null);
  useEffect(() => {
    if (!hasShareIntent || !libraryLoaded) return;
    const key = `${shareIntent.webUrl ?? ""}|${shareIntent.text ?? ""}`;
    if (handledShare.current === key) return;
    handledShare.current = key;
    resetShareIntent();
    // Reacting to an outside event (a link shared in from another app), so updating state here is intended.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (shareIntent.webUrl) save(shareIntent.webUrl);
    else setFeedback({ text: "That share didn't include a link, so nothing was saved.", isError: true });
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per incoming share
  }, [hasShareIntent, libraryLoaded, shareIntent]);

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
      <PasteLinkBox onSave={save} saving={saving} feedback={feedback} />
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

function PasteLinkBox({ onSave, saving, feedback }: {
  onSave: (url: string) => Promise<boolean>;
  saving: boolean;
  feedback: Feedback | null;
}) {
  const [url, setUrl] = useState("");
  const busy = saving;

  const submit = async () => {
    if (!url.trim() || busy) return;
    if (await onSave(url)) setUrl("");
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
          onSubmitEditing={submit}
        />
        <Pressable
          accessibilityRole="button"
          onPress={submit}
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
