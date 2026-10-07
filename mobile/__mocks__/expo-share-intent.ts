// Test stand-in for expo-share-intent (the real one needs the native Android/iOS module).
// Tests call `mockShare(...)` to simulate a link arriving from another app's Share menu.
import type { ReactNode } from "react";

type ShareIntent = { webUrl: string | null; text: string | null; type: string | null; files: null };

const empty: ShareIntent = { webUrl: null, text: null, type: null, files: null };
let current = { hasShareIntent: false, shareIntent: empty };

export const resetShareIntent = jest.fn(() => {
  current = { hasShareIntent: false, shareIntent: empty };
});

export function mockShare(share: Partial<ShareIntent> | null) {
  current = share
    ? { hasShareIntent: true, shareIntent: { ...empty, type: share.webUrl ? "weburl" : "text", ...share } }
    : { hasShareIntent: false, shareIntent: empty };
}

export const useShareIntentContext = () => ({ isReady: true, error: null, resetShareIntent, ...current });
export const ShareIntentProvider = ({ children }: { children: ReactNode }) => children;
export const getShareExtensionKey = () => "inspirationlibraryShareKey";
