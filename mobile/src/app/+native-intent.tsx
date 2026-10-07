import { getShareExtensionKey } from "expo-share-intent";

/**
 * Called by Expo Router for links that open the app. A share from another app arrives as a special
 * link; send it to the library (which saves it) instead of looking for a screen with that name.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    return path.includes(`dataUrl=${getShareExtensionKey()}`) ? "/" : path;
  } catch {
    return "/";
  }
}
