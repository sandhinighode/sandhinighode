import { looksLikeEmail, sendCode, signOut, verifyCode } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

jest.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: true,
  supabase: { auth: { signInWithOtp: jest.fn(), verifyOtp: jest.fn(), signOut: jest.fn() } },
}));
const mockAuth = supabase!.auth as unknown as Record<"signInWithOtp" | "verifyOtp" | "signOut", jest.Mock>;

beforeEach(() => jest.clearAllMocks());

test("sendCode emails a code to the tidied-up address and allows new accounts", async () => {
  mockAuth.signInWithOtp.mockResolvedValue({ error: null });
  await sendCode("  Me@Example.COM ");
  expect(mockAuth.signInWithOtp).toHaveBeenCalledWith({
    email: "me@example.com",
    options: { shouldCreateUser: true },
  });
});

test("verifyCode checks the email code", async () => {
  mockAuth.verifyOtp.mockResolvedValue({ error: null });
  await verifyCode("Me@Example.com", " 123456 ");
  expect(mockAuth.verifyOtp).toHaveBeenCalledWith({ email: "me@example.com", token: "123456", type: "email" });
});

test("errors from Supabase become readable errors", async () => {
  mockAuth.signInWithOtp.mockResolvedValue({ error: { message: "Email rate limit exceeded" } });
  await expect(sendCode("me@example.com")).rejects.toThrow("Email rate limit exceeded");

  mockAuth.verifyOtp.mockResolvedValue({ error: { message: "Token has expired or is invalid" } });
  await expect(verifyCode("me@example.com", "1")).rejects.toThrow("Token has expired or is invalid");

  mockAuth.signOut.mockResolvedValue({ error: { message: "Network error" } });
  await expect(signOut()).rejects.toThrow("Network error");
});

test("looksLikeEmail accepts normal addresses only", () => {
  expect(looksLikeEmail(" me@example.com ")).toBe(true);
  expect(looksLikeEmail("me@example")).toBe(false);
  expect(looksLikeEmail("me example.com")).toBe(false);
  expect(looksLikeEmail("")).toBe(false);
});
