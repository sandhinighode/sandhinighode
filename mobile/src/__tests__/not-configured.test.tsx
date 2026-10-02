import { render, screen } from "@testing-library/react-native";

import LibraryScreen from "@/app/index";
import { fetchSaves } from "@/lib/saves";

jest.mock("@/lib/supabase", () => ({ isSupabaseConfigured: false, supabase: null }));
jest.mock("@/lib/saves", () => ({ fetchSaves: jest.fn() }));

test("explains how to connect the database when .env is missing", async () => {
  await render(<LibraryScreen />);

  expect(screen.getByText("Database not connected yet")).toBeOnTheScreen();
  expect(fetchSaves).not.toHaveBeenCalled();
});
