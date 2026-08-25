import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App, { Lab1SystemCheck } from "../../src/App.js";
import * as api from "../../src/api.js";

afterEach(() => vi.restoreAllMocks());

describe("App", () => {
  // WORKED EXAMPLE — provided for you.
  it("renders the TokTickIT heading", () => {
    render(<App />);
    expect(screen.getByText(/TokTickIT/i)).toBeInTheDocument();
  });

  it("shows Online after a successful system response", async () => {
    const checkSystem = vi.spyOn(api, "checkSystem").mockResolvedValue({
      online: true,
      categories: [],
    });
    const user = userEvent.setup();

    render(<Lab1SystemCheck />);
    await user.click(screen.getByRole("button", { name: "Check System" }));

    expect(await screen.findByText("System Status: Online")).toBeInTheDocument();
    expect(checkSystem).toHaveBeenCalledOnce();
  });

  it("shows Offline and a useful message when the system check fails", async () => {
    vi.spyOn(api, "checkSystem").mockRejectedValue(new Error("request failed"));
    const user = userEvent.setup();

    render(<Lab1SystemCheck />);
    await user.click(screen.getByRole("button", { name: "Check System" }));

    expect(await screen.findByText("System Status: Offline")).toBeInTheDocument();
    expect(screen.getByText("Unable to connect to TokTickIT API")).toBeInTheDocument();
  });

  it("shows loading, Online, and categories from the API result", async () => {
    let resolveCheck!: (result: api.SystemStatus) => void;
    const pendingCheck = new Promise<api.SystemStatus>((resolve) => {
      resolveCheck = resolve;
    });
    vi.spyOn(api, "checkSystem").mockReturnValue(pendingCheck);
    const user = userEvent.setup();

    render(<Lab1SystemCheck />);
    await user.click(screen.getByRole("button", { name: "Check System" }));

    expect(screen.getByRole("button", { name: "Loading…" })).toBeDisabled();

    resolveCheck({
      online: true,
      categories: [
        { id: 1, name: "Account and Access" },
        { id: 2, name: "Hardware" },
        { id: 3, name: "Software" },
        { id: 4, name: "Network" },
      ],
    });

    expect(await screen.findByText("System Status: Online")).toBeInTheDocument();
    expect(screen.getByText("Supported Request Categories")).toBeInTheDocument();
    expect(screen.getByText("Account and Access")).toBeInTheDocument();
    expect(screen.getByText("Hardware")).toBeInTheDocument();
    expect(screen.getByText("Software")).toBeInTheDocument();
    expect(screen.getByText("Network")).toBeInTheDocument();
  });

  it("clears stale categories and shows Offline when the API is unavailable", async () => {
    vi.spyOn(api, "checkSystem")
      .mockResolvedValueOnce({ online: true, categories: [{ id: 1, name: "Hardware" }] })
      .mockRejectedValueOnce(new Error("request failed"));
    const user = userEvent.setup();

    render(<Lab1SystemCheck />);
    await user.click(screen.getByRole("button", { name: "Check System" }));
    expect(await screen.findByText("Hardware")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Check System" }));

    expect(await screen.findByText("System Status: Offline")).toBeInTheDocument();
    expect(screen.getByText("Unable to connect to TokTickIT API")).toBeInTheDocument();
    expect(screen.queryByText("Hardware")).not.toBeInTheDocument();
  });
});
