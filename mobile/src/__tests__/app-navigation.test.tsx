import type { Session } from "@supabase/supabase-js";
import { renderRouter, screen } from "expo-router/testing-library";

import { useSession } from "@/lib/auth";

// Uses the real app layout and screens; only the login state and the database are faked.
jest.mock("@/lib/auth", () => ({ ...jest.requireActual("@/lib/auth"), useSession: jest.fn() }));
jest.mock("@/lib/supabase", () => ({ isSupabaseConfigured: true, supabase: null }));
jest.mock("@/lib/saves", () => ({ fetchSaves: jest.fn().mockResolvedValue([]) }));
const mockUseSession = jest.mocked(useSession);

const fakeSession = { user: { id: "u1", email: "me@example.com" } } as unknown as Session;

test("signed out: shows the sign-in screen, not the library", async () => {
  mockUseSession.mockReturnValue(null);
  await renderRouter("./src/app");

  expect(await screen.findByText("We'll email you a code. No password needed.")).toBeOnTheScreen();
  expect(screen.queryByText("No saves yet")).toBeNull();
});

test("signed in: shows the library with a sign-out button", async () => {
  mockUseSession.mockReturnValue(fakeSession);
  await renderRouter("./src/app");

  expect(await screen.findByText("No saves yet")).toBeOnTheScreen();
  expect(screen.getByText("Sign out")).toBeOnTheScreen();
  expect(screen.queryByText("We'll email you a code. No password needed.")).toBeNull();
});
