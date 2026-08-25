import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App.js";
import {
  RequesterContextProvider,
  RequesterScoped,
  useRequesterContext,
} from "../../src/requester-context.js";

const activeRequesters = [
  { id: 1, name: "Anan Student", email: "anan.student@example.test" },
  { id: 2, name: "Mali Student", email: "mali.student@example.test" },
];

function ScopedStateProbe() {
  const [value, setValue] = useState("clean");
  return (
    <>
      <output data-testid="scoped-state">{value}</output>
      <button type="button" onClick={() => setValue("dirty")}>Change scoped state</button>
    </>
  );
}

function ContextProbe() {
  const { currentRequester, error, retry, selectRequester, status } = useRequesterContext();
  return (
    <>
      <output data-testid="context-status">{status}</output>
      <output data-testid="current-requester">{currentRequester?.name ?? "none"}</output>
      <output data-testid="current-email">{currentRequester?.email ?? "none"}</output>
      <output data-testid="context-error">{error ?? "none"}</output>
      <button type="button" onClick={retry}>Retry</button>
      <button type="button" onClick={() => selectRequester(1)}>Select Anan</button>
      <button type="button" onClick={() => selectRequester(2)}>Select Mali</button>
      <RequesterScoped><ScopedStateProbe /></RequesterScoped>
    </>
  );
}

describe("UT-07 Development Requester context", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("loads active Development Requesters when the application context initializes", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/development-requesters"),
      );
    });
  });

  it("enters selection state without a current Requester when storage is missing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => activeRequesters,
    }));

    render(
      <RequesterContextProvider>
        <ContextProbe />
      </RequesterContextProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("context-status")).toHaveTextContent("selection"));
    expect(screen.getByTestId("current-requester")).toHaveTextContent("none");
    expect(sessionStorage.getItem("toktickit.developmentRequesterId")).toBeNull();
  });

  it("restores a syntactically valid stored ID only when it is in the active API result", async () => {
    sessionStorage.setItem("toktickit.developmentRequesterId", "2");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => activeRequesters,
    }));

    render(
      <RequesterContextProvider>
        <ContextProbe />
      </RequesterContextProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("context-status")).toHaveTextContent("ready"));
    expect(screen.getByTestId("current-requester")).toHaveTextContent("Mali Student");
    expect(sessionStorage.getItem("toktickit.developmentRequesterId")).toBe("2");
  });

  it.each(["abc", "0", "-1", "1.5", "01"]) (
    "clears malformed persisted Requester ID %s before context restoration",
    async (invalidId) => {
      sessionStorage.setItem("toktickit.developmentRequesterId", invalidId);
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: async () => activeRequesters,
      }));

      render(
        <RequesterContextProvider>
          <ContextProbe />
        </RequesterContextProvider>,
      );

      await waitFor(() => expect(screen.getByTestId("context-status")).toHaveTextContent("selection"));
      expect(screen.getByTestId("current-requester")).toHaveTextContent("none");
      expect(sessionStorage.getItem("toktickit.developmentRequesterId")).toBeNull();
    },
  );

  it("clears a syntactically valid but unknown or inactive ID after active data loads", async () => {
    sessionStorage.setItem("toktickit.developmentRequesterId", "99");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => activeRequesters,
    }));

    render(
      <RequesterContextProvider>
        <ContextProbe />
      </RequesterContextProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("context-status")).toHaveTextContent("selection"));
    expect(screen.getByTestId("current-requester")).toHaveTextContent("none");
    expect(sessionStorage.getItem("toktickit.developmentRequesterId")).toBeNull();
  });

  it("keeps a valid stored ID unresolved during API failure and supports safe retry", async () => {
    sessionStorage.setItem("toktickit.developmentRequesterId", "2");
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error("network secret: https://user:password@example"))
      .mockResolvedValueOnce({ ok: true, json: async () => activeRequesters });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <RequesterContextProvider>
        <ContextProbe />
      </RequesterContextProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("context-status")).toHaveTextContent("error"));
    expect(screen.getByTestId("current-requester")).toHaveTextContent("none");
    expect(screen.getByTestId("context-error")).toHaveTextContent("Unable to load Development Requesters");
    expect(screen.getByTestId("context-error")).not.toHaveTextContent(/password|example/i);
    expect(sessionStorage.getItem("toktickit.developmentRequesterId")).toBe("2");

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(screen.getByTestId("context-status")).toHaveTextContent("ready"));
    expect(screen.getByTestId("current-requester")).toHaveTextContent("Mali Student");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("selects an active Requester and persists only its canonical integer ID", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => activeRequesters,
    }));

    render(
      <RequesterContextProvider>
        <ContextProbe />
      </RequesterContextProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("context-status")).toHaveTextContent("selection"));

    fireEvent.click(screen.getByRole("button", { name: "Select Anan" }));
    expect(screen.getByTestId("context-status")).toHaveTextContent("ready");
    expect(screen.getByTestId("current-requester")).toHaveTextContent("Anan Student");
    expect(screen.getByTestId("current-email")).toHaveTextContent("anan.student@example.test");
    expect(sessionStorage.getItem("toktickit.developmentRequesterId")).toBe("1");
    expect(sessionStorage.length).toBe(1);
  });

  it("remounts the Requester-scoped boundary when switching Requesters", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => activeRequesters,
    }));

    render(
      <RequesterContextProvider>
        <ContextProbe />
      </RequesterContextProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("context-status")).toHaveTextContent("selection"));

    fireEvent.click(screen.getByRole("button", { name: "Select Anan" }));
    fireEvent.click(screen.getByRole("button", { name: "Change scoped state" }));
    expect(screen.getByTestId("scoped-state")).toHaveTextContent("dirty");

    fireEvent.click(screen.getByRole("button", { name: "Select Mali" }));
    await waitFor(() => expect(screen.getByTestId("current-requester")).toHaveTextContent("Mali Student"));
    expect(screen.getByTestId("scoped-state")).toHaveTextContent("clean");
    expect(sessionStorage.getItem("toktickit.developmentRequesterId")).toBe("2");
  });
});
