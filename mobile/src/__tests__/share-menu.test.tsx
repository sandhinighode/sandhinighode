import { render, screen } from "@testing-library/react-native";
// @ts-expect-error -- mockShare only exists in the test stand-in (mobile/__mocks__/expo-share-intent.ts)
import { mockShare, resetShareIntent } from "expo-share-intent";

import { redirectSystemPath } from "@/app/+native-intent";
import LibraryScreen from "@/app/index";
import { fetchSaves, type Save, saveLink } from "@/lib/saves";

jest.mock("@/lib/supabase", () => ({ isSupabaseConfigured: true, supabase: null }));
jest.mock("@/lib/saves", () => ({ fetchSaves: jest.fn(), saveLink: jest.fn() }));
const mockFetchSaves = jest.mocked(fetchSaves);
const mockSaveLink = jest.mocked(saveLink);

const pin: Save = {
  id: "p1",
  url: "https://www.pinterest.com/pin/123/",
  source: "pinterest",
  title: "Scandinavian reading nook",
  description: null,
  status: "ready",
  processing_error: null,
  created_at: "2026-10-07T09:00:00Z",
};

beforeEach(() => {
  jest.clearAllMocks();
  mockShare(null);
});

test("a link shared from another app is saved and shown at the top", async () => {
  mockFetchSaves.mockResolvedValue([]);
  mockSaveLink.mockResolvedValue({ save: pin, created: true });
  mockShare({ webUrl: "https://pin.it/abc", text: "Look at this https://pin.it/abc" });

  await render(<LibraryScreen />);

  expect(await screen.findByText("Saved ✓")).toBeOnTheScreen();
  expect(mockSaveLink).toHaveBeenCalledTimes(1);
  expect(mockSaveLink).toHaveBeenCalledWith("https://pin.it/abc");
  expect(screen.getByText("Scandinavian reading nook")).toBeOnTheScreen();
  expect(resetShareIntent).toHaveBeenCalled();
});

test("sharing a link that's already saved says so", async () => {
  mockFetchSaves.mockResolvedValue([pin]);
  mockSaveLink.mockResolvedValue({ save: pin, created: false });
  mockShare({ webUrl: pin.url, text: pin.url });

  await render(<LibraryScreen />);

  expect(await screen.findByText("Already in your library")).toBeOnTheScreen();
  expect(screen.getAllByTestId("save-row")).toHaveLength(1);
});

test("shared text without a link is not sent to the server", async () => {
  mockFetchSaves.mockResolvedValue([]);
  mockShare({ webUrl: null, text: "just some words" });

  await render(<LibraryScreen />);

  expect(await screen.findByText("That share didn't include a link, so nothing was saved.")).toBeOnTheScreen();
  expect(mockSaveLink).not.toHaveBeenCalled();
});

test("a share that arrives while the library is loading is saved once it has loaded", async () => {
  let finishLoading!: (saves: Save[]) => void;
  mockFetchSaves.mockReturnValue(new Promise((resolve) => (finishLoading = resolve)));
  mockSaveLink.mockResolvedValue({ save: pin, created: true });
  mockShare({ webUrl: "https://pin.it/abc", text: "https://pin.it/abc" });

  await render(<LibraryScreen />);
  expect(mockSaveLink).not.toHaveBeenCalled();

  finishLoading([]);
  expect(await screen.findByText("Saved ✓")).toBeOnTheScreen();
  expect(mockSaveLink).toHaveBeenCalledTimes(1);
});

test("an error while saving a shared link is shown", async () => {
  mockFetchSaves.mockResolvedValue([]);
  mockSaveLink.mockRejectedValue(new Error("Sign in required."));
  mockShare({ webUrl: "https://youtu.be/x", text: "https://youtu.be/x" });

  await render(<LibraryScreen />);

  expect(await screen.findByText("Sign in required.")).toBeOnTheScreen();
});

test("share links that open the app are sent to the library screen", () => {
  expect(redirectSystemPath({ path: "inspirationlibrary://dataUrl=inspirationlibraryShareKey", initial: true }))
    .toBe("/");
  expect(redirectSystemPath({ path: "/sign-in", initial: false })).toBe("/sign-in");
});
