import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

afterEach(() => vi.restoreAllMocks());

describe("App", () => {
  // WORKED EXAMPLE — provided for you.
  it("renders the TokTickIT heading", () => {
    render(<App />);
    expect(screen.getByText(/TokTickIT/i)).toBeInTheDocument();
  });

  it("shows Online after a successful health response", async () => {
    const checkHealth = vi.spyOn(api, "checkHealth").mockResolvedValue({
      status: "ok",
      service: "TokTickIT API",
    });
    const user = userEvent.setup();

    render(<App />);
    await user.click(screen.getByRole("button", { name: "Check System" }));

    expect(await screen.findByText("System Status: Online")).toBeInTheDocument();
    expect(checkHealth).toHaveBeenCalledOnce();
  });

  it("shows Offline and a useful message when health fails", async () => {
    vi.spyOn(api, "checkHealth").mockRejectedValue(new Error("request failed"));
    const user = userEvent.setup();

    render(<App />);
    await user.click(screen.getByRole("button", { name: "Check System" }));

    expect(await screen.findByText("System Status: Offline")).toBeInTheDocument();
    expect(screen.getByText("Unable to connect to TokTickIT API")).toBeInTheDocument();
  });

  // Issue 4 — write these yourself. Hint: mock the api module with
  // vi.spyOn(api, "checkSystem").mockResolvedValue(...) / .mockRejectedValue(...)
  // then click the button and assert the Online list / Offline message.
  it.todo("shows Online and the seeded categories on success");
  it.todo("shows an Offline error message when the API is unavailable");
});
