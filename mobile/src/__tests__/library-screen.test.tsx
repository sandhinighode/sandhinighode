import { fireEvent, render, screen } from "@testing-library/react-native";

import LibraryScreen from "@/app/index";
import { fetchSaves, type Save, saveLink } from "@/lib/saves";

// The screen is tested against a fake database: these tests check what the app shows,
// not whether Supabase is reachable (that is checked by hand, see DEVELOPMENT_PLAN.md).
jest.mock("@/lib/supabase", () => ({ isSupabaseConfigured: true, supabase: null }));
jest.mock("@/lib/saves", () => ({ fetchSaves: jest.fn(), saveLink: jest.fn() }));
const mockFetchSaves = fetchSaves as jest.MockedFunction<typeof fetchSaves>;
const mockSaveLink = jest.mocked(saveLink);

beforeEach(() => jest.clearAllMocks());

const testSave: Save = {
  id: "00000000-0000-0000-0000-0000000000aa",
  url: "https://example.com/my-first-inspiration",
  source: "web",
  title: "My first saved inspiration",
  description: "Test record created in Milestone 1.",
  status: "ready",
  processing_error: null,
  created_at: "2026-10-01T09:00:00Z",
};

test("shows saves returned by the database", async () => {
  mockFetchSaves.mockResolvedValue([testSave]);
  await render(<LibraryScreen />);

  expect(await screen.findByText("My first saved inspiration")).toBeOnTheScreen();
  expect(screen.getByText("Test record created in Milestone 1.")).toBeOnTheScreen();
  expect(screen.getByText("https://example.com/my-first-inspiration")).toBeOnTheScreen();
  expect(screen.getAllByTestId("save-row")).toHaveLength(1);
});

test("falls back to the URL when a save has no title", async () => {
  mockFetchSaves.mockResolvedValue([{ ...testSave, title: null, description: null }]);
  await render(<LibraryScreen />);

  expect(await screen.findAllByText("https://example.com/my-first-inspiration")).toHaveLength(2);
});

test("shows an empty state when there are no saves", async () => {
  mockFetchSaves.mockResolvedValue([]);
  await render(<LibraryScreen />);

  expect(await screen.findByText("No saves yet")).toBeOnTheScreen();
});

test("shows the error when the database can't be reached", async () => {
  mockFetchSaves.mockRejectedValue(new Error("permission denied for table saves"));
  await render(<LibraryScreen />);

  expect(await screen.findByText("Couldn't load your library")).toBeOnTheScreen();
  expect(screen.getByText("permission denied for table saves")).toBeOnTheScreen();
});

const youtubeSave: Save = {
  id: "00000000-0000-0000-0000-0000000000bb",
  url: "https://youtu.be/dQw4w9WgXcQ",
  source: "youtube",
  title: "Never Gonna Give You Up",
  description: null,
  status: "ready",
  processing_error: null,
  created_at: "2026-10-04T09:00:00Z",
};

async function pasteAndSave(url: string) {
  await fireEvent.changeText(await screen.findByPlaceholderText("Paste a link"), url);
  await fireEvent.press(screen.getByRole("button", { name: "Save" }));
}

test("pasting a link saves it and shows it at the top of the library", async () => {
  mockFetchSaves.mockResolvedValue([testSave]);
  mockSaveLink.mockResolvedValue({ save: youtubeSave, created: true });
  await render(<LibraryScreen />);

  await pasteAndSave("https://youtu.be/dQw4w9WgXcQ");

  expect(mockSaveLink).toHaveBeenCalledWith("https://youtu.be/dQw4w9WgXcQ");
  expect(await screen.findByText("Saved ✓")).toBeOnTheScreen();
  const titles = screen.getAllByTestId("save-row").map((row) => row.props.children[0].props.children);
  expect(titles).toEqual(["Never Gonna Give You Up", "My first saved inspiration"]);
  expect(screen.getByPlaceholderText("Paste a link").props.value).toBe("");
});

test("saving a link that is already saved says so and doesn't duplicate it", async () => {
  mockFetchSaves.mockResolvedValue([youtubeSave]);
  mockSaveLink.mockResolvedValue({ save: youtubeSave, created: false });
  await render(<LibraryScreen />);

  await pasteAndSave("https://www.youtube.com/watch?v=dQw4w9WgXcQ");

  expect(await screen.findByText("Already in your library")).toBeOnTheScreen();
  expect(screen.getAllByTestId("save-row")).toHaveLength(1);
});

test("a saved link whose details couldn't be read shows the reason", async () => {
  mockFetchSaves.mockResolvedValue([]);
  mockSaveLink.mockResolvedValue({
    save: {
      ...youtubeSave,
      id: "ig",
      source: "instagram",
      url: "https://www.instagram.com/p/abc/",
      title: null,
      status: "failed",
      processing_error: "Instagram didn't share details for this post (it usually requires login). The link is saved.",
    },
    created: true,
  });
  await render(<LibraryScreen />);

  await pasteAndSave("https://www.instagram.com/p/abc/");

  expect(await screen.findByText("Saved, but its details couldn't be read")).toBeOnTheScreen();
  expect(screen.getByText(/Instagram didn't share details/)).toBeOnTheScreen();
});

test("an invalid link shows the error and keeps what was typed", async () => {
  mockFetchSaves.mockResolvedValue([]);
  mockSaveLink.mockRejectedValue(new Error('"not a link" is not a valid URL.'));
  await render(<LibraryScreen />);

  await pasteAndSave("not a link");

  expect(await screen.findByText('"not a link" is not a valid URL.')).toBeOnTheScreen();
  expect(screen.getByPlaceholderText("Paste a link").props.value).toBe("not a link");
});
