import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";

import { fetchSaves, type Save } from "@/lib/saves";
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
    <FlatList
      data={state.saves}
      keyExtractor={(save) => save.id}
      renderItem={({ item }) => <SaveRow save={item} />}
      onRefresh={refresh}
      refreshing={refreshing}
      contentContainerStyle={state.saves.length === 0 ? styles.center : styles.list}
      ListEmptyComponent={<Message title="No saves yet" body="Your saved inspiration will appear here." />}
    />
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
  center: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 },
  list: { padding: 16, gap: 12 },
  card: { padding: 16, borderRadius: 12, backgroundColor: "#f2f2f2", gap: 4 },
  title: { fontSize: 17, fontWeight: "600", textAlign: "left" },
  description: { fontSize: 15, color: "#333" },
  meta: { fontSize: 13, color: "#666" },
  url: { fontSize: 13, color: "#1a5fb4" },
  messageBody: { fontSize: 15, color: "#555", textAlign: "center" },
});
