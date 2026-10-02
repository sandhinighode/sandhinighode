import { render, screen } from "@testing-library/react-native";

import LibraryScreen from "@/app/index";
import { fetchSaves, type Save } from "@/lib/saves";

// The screen is tested against a fake database: these tests check what the app shows,
// not whether Supabase is reachable (that is checked by hand, see DEVELOPMENT_PLAN.md).
jest.mock("@/lib/supabase", () => ({ isSupabaseConfigured: true, supabase: null }));
jest.mock("@/lib/saves", () => ({ fetchSaves: jest.fn() }));
const mockFetchSaves = fetchSaves as jest.MockedFunction<typeof fetchSaves>;

const testSave: Save = {
  id: "00000000-0000-0000-0000-0000000000aa",
  url: "https://example.com/my-first-inspiration",
  source: "web",
  title: "My first saved inspiration",
  description: "Test record created in Milestone 1.",
  status: "ready",
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
