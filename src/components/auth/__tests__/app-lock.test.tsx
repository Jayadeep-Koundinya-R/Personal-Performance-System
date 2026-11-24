import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AppLockModal, AppLockModalProps } from "../AppLockModal";

const onUnlock = vi.fn();
const onUnlocked = vi.fn();
const onBiometricPrompt = vi.fn();

function renderLock(overrides: Partial<AppLockModalProps> = {}) {
  const props: AppLockModalProps = {
    isOpen: true,
    onUnlock,
    onUnlocked,
    onBiometricPrompt,
    hasBiometrics: true,
    ...overrides,
  };
  return render(<AppLockModal {...props} />);
}

function filledSlots(): number {
  return screen
    .getAllByTestId("pin-slot")
    .filter((el) => el.getAttribute("data-filled") === "true").length;
}

function enterPin(digits: string) {
  for (const d of digits) {
    fireEvent.click(screen.getByTestId(`key-${d}`));
  }
}

describe("🔒 AppLockModal", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    onUnlock.mockResolvedValue(true);
    onBiometricPrompt.mockResolvedValue(false);
  });

  it("renders nothing when closed", () => {
    renderLock({ isOpen: false });
    expect(screen.queryByTestId("app-lock-overlay")).not.toBeInTheDocument();
  });

  it("accumulates entered digits into the PIN display", () => {
    renderLock();
    fireEvent.click(screen.getByTestId("key-1"));
    fireEvent.click(screen.getByTestId("key-2"));
    fireEvent.click(screen.getByTestId("key-3"));
    expect(filledSlots()).toBe(3);
  });

  it("removes the last digit on backspace", () => {
    renderLock();
    enterPin("123");
    expect(filledSlots()).toBe(3);
    fireEvent.click(screen.getByTestId("key-backspace"));
    expect(filledSlots()).toBe(2);
  });

  it("clears the whole PIN on clear", () => {
    renderLock();
    enterPin("12");
    expect(filledSlots()).toBe(2);
    fireEvent.click(screen.getByTestId("key-clear"));
    expect(filledSlots()).toBe(0);
  });

  it("auto-submits the full PIN to onUnlock", async () => {
    renderLock();
    enterPin("1234");
    await waitFor(() => expect(onUnlock).toHaveBeenCalledWith("1234"));
  });

  it("calls onUnlocked once PIN verification succeeds", async () => {
    renderLock();
    enterPin("1234");
    await waitFor(() => expect(onUnlocked).toHaveBeenCalledTimes(1));
  });

  it("prompts for biometrics when the biometric button is clicked", async () => {
    onBiometricPrompt.mockResolvedValue(true);
    renderLock();
    fireEvent.click(screen.getByTestId("biometric-button"));
    await waitFor(() => expect(onBiometricPrompt).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onUnlock).toHaveBeenCalledWith());
    await waitFor(() => expect(onUnlocked).toHaveBeenCalledTimes(1));
  });

  it("shows an error and does not unlock when biometrics fail", async () => {
    onBiometricPrompt.mockResolvedValue(false);
    renderLock();
    fireEvent.click(screen.getByTestId("biometric-button"));
    await waitFor(() =>
      expect(screen.getByTestId("lock-error")).toHaveTextContent("Biometric authentication failed")
    );
    expect(onUnlock).not.toHaveBeenCalled();
    expect(onUnlocked).not.toHaveBeenCalled();
  });

  it("shakes and shows an error on an incorrect PIN", async () => {
    onUnlock.mockResolvedValue(false);
    renderLock();
    enterPin("1234");
    await waitFor(() =>
      expect(screen.getByTestId("lock-error")).toHaveTextContent("Incorrect PIN")
    );
    expect(screen.getByTestId("pin-area").getAttribute("data-shake")).toBe("1");
  });

  it("triggers a lockout countdown after three failed attempts", async () => {
    onUnlock.mockResolvedValue(false);
    renderLock();

    enterPin("1234");
    await waitFor(() => expect(screen.getByTestId("lock-error")).toBeInTheDocument());

    enterPin("1234");
    await waitFor(() => expect(screen.getByTestId("lock-error")).toBeInTheDocument());

    enterPin("1234");
    await waitFor(() => expect(screen.getByTestId("lockout-countdown")).toBeInTheDocument());
    expect(screen.queryByTestId("keypad")).not.toBeInTheDocument();
  });

  it("keeps the paste input out of the tab order (focus trap)", () => {
    renderLock();
    const input = document.querySelector("input[type='text'][inputmode='numeric']");
    expect(input).toBeInTheDocument();
    expect((input as HTMLInputElement).tabIndex).toBe(-1);
  });

  it("pastes digits into the PIN via the hidden numeric input", async () => {
    const { container } = render(<AppLockModal {...{ isOpen: true, onUnlock, onUnlocked, onBiometricPrompt, hasBiometrics: true }} />);
    const input = container.querySelector('[data-testid="paste-input"]');
    expect(input).toBeInTheDocument();
    fireEvent.change(input as HTMLInputElement, { target: { value: "567890" } });
    await waitFor(() => expect(filledSlots()).toBe(4));
    await waitFor(() => expect(onUnlock).toHaveBeenCalledWith("5678"));
  });
});