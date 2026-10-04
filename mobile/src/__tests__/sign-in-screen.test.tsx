import { fireEvent, render, screen } from "@testing-library/react-native";

import SignInScreen from "@/app/sign-in";
import { sendCode, verifyCode } from "@/lib/auth";

jest.mock("@/lib/auth", () => ({
  ...jest.requireActual("@/lib/auth"),
  sendCode: jest.fn(),
  verifyCode: jest.fn(),
}));
jest.mock("@/lib/supabase", () => ({ isSupabaseConfigured: true, supabase: null }));
const mockSendCode = jest.mocked(sendCode);
const mockVerifyCode = jest.mocked(verifyCode);

beforeEach(() => jest.clearAllMocks());

test("sends a code to the email, then signs in with the code", async () => {
  mockSendCode.mockResolvedValue();
  mockVerifyCode.mockResolvedValue();
  await render(<SignInScreen />);

  await fireEvent.changeText(screen.getByPlaceholderText("you@example.com"), "Me@Example.com");
  await fireEvent.press(screen.getByText("Send code"));
  expect(mockSendCode).toHaveBeenCalledWith("Me@Example.com");

  expect(await screen.findByText("Enter the code we sent to Me@Example.com.")).toBeOnTheScreen();
  await fireEvent.changeText(screen.getByPlaceholderText("Code from the email"), "12 34-56");
  await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
  expect(mockVerifyCode).toHaveBeenCalledWith("Me@Example.com", "123456");
});

test("rejects an invalid email without contacting the server", async () => {
  await render(<SignInScreen />);

  await fireEvent.changeText(screen.getByPlaceholderText("you@example.com"), "not-an-email");
  await fireEvent.press(screen.getByText("Send code"));

  expect(await screen.findByText("Please enter a valid email address.")).toBeOnTheScreen();
  expect(mockSendCode).not.toHaveBeenCalled();
});

test("shows the server's message when sending the code fails", async () => {
  mockSendCode.mockRejectedValue(new Error("Email rate limit exceeded"));
  await render(<SignInScreen />);

  await fireEvent.changeText(screen.getByPlaceholderText("you@example.com"), "me@example.com");
  await fireEvent.press(screen.getByText("Send code"));

  expect(await screen.findByText("Email rate limit exceeded")).toBeOnTheScreen();
  expect(screen.queryByPlaceholderText("Code from the email")).toBeNull();
});

test("shows an error for a wrong code and lets you try again", async () => {
  mockSendCode.mockResolvedValue();
  mockVerifyCode.mockRejectedValue(new Error("Token has expired or is invalid"));
  await render(<SignInScreen />);

  await fireEvent.changeText(screen.getByPlaceholderText("you@example.com"), "me@example.com");
  await fireEvent.press(screen.getByText("Send code"));
  await fireEvent.changeText(await screen.findByPlaceholderText("Code from the email"), "000000");
  await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));

  expect(await screen.findByText("Token has expired or is invalid")).toBeOnTheScreen();
  expect(screen.getByPlaceholderText("Code from the email")).toBeOnTheScreen();
});

test("can go back and use a different email", async () => {
  mockSendCode.mockResolvedValue();
  await render(<SignInScreen />);

  await fireEvent.changeText(screen.getByPlaceholderText("you@example.com"), "me@example.com");
  await fireEvent.press(screen.getByText("Send code"));
  await fireEvent.press(await screen.findByText("Use a different email"));

  expect(screen.getByPlaceholderText("you@example.com")).toBeOnTheScreen();
});
