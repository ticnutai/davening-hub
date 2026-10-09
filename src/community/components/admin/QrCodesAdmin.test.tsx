import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { communityQrUrl, QrCodesAdmin } from "./QrCodesAdmin";

const state = vi.hoisted(() => ({ community: { id: "a", slug: "shul-a", name: "בית א" } as { id: string; slug: string; name: string } | null }));
vi.mock("@/community/lib/community", () => ({ useCommunity: () => state.community }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); state.community = { id: "a", slug: "shul-a", name: "בית א" }; });

describe("synagogue-specific QR destinations", () => {
  it("replaces stale admin query parameters with the selected synagogue", () => {
    expect(communityQrUrl("shul-b", "https://example.com/community/admin?shul=shul-a&tab=qr"))
      .toBe("https://example.com/community?shul=shul-b");
  });
  it("retains the local entry and puts the community selector before the hash", () => {
    expect(communityQrUrl("local", "https://example.com/new-shul.html?studio=1#/manage/settings"))
      .toBe("https://example.com/new-shul.html?shul=local#/community");
  });
  it("updates the shown destination and clipboard target when selection changes", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    const { rerender } = render(<QrCodesAdmin />);
    expect(screen.getByRole("heading", { name: "אתר בית הכנסת — בית א" })).toBeInTheDocument();
    state.community = { id: "b", slug: "shul-b", name: "בית ב" };
    rerender(<QrCodesAdmin />);
    expect(screen.getByRole("heading", { name: "אתר בית הכנסת — בית ב" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "העתקת כתובת" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/community?shul=shul-b`));
    expect(screen.queryByText(/Google Play/)).toBeNull();
  });
  it("reports clipboard rejection without claiming success", async () => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
    render(<QrCodesAdmin />);
    fireEvent.click(screen.getByRole("button", { name: "העתקת כתובת" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(toast.success).not.toHaveBeenCalled();
  });
  it("does not offer an unscoped QR before a synagogue is selected", () => {
    state.community = null;
    render(<QrCodesAdmin />);
    expect(screen.queryByTestId("qr-website")).toBeNull();
    expect(screen.getByText("יש לבחור בית כנסת לפני יצירת קוד QR.")).toBeInTheDocument();
  });
});
