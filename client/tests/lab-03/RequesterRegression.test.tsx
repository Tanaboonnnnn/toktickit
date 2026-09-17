import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App.js";
import {
  AUTHENTICATED_REQUESTER,
  authenticatedAppResponse,
  openAuthenticatedRequesterRoute,
  TEST_CSRF_TOKEN,
} from "../lab-02/support/authenticated-app.js";

const category = { id: 2, name: "Hardware" };
const relatedSystem = { id: 3, name: "University Email" };
const listTicket = {
  id: 42,
  ticketNumber: "TKT-20260917-REQ046",
  category,
  relatedSystem,
  summary: "Authenticated Requester continuity",
  requestedPriority: "HIGH" as const,
  currentStatus: "REOPENED" as const,
  createdAt: "2026-09-17T01:00:00.000Z",
  updatedAt: "2026-09-17T02:00:00.000Z",
};

const detailTicket = {
  ...listTicket,
  requester: {
    id: AUTHENTICATED_REQUESTER.id,
    name: AUTHENTICATED_REQUESTER.name,
    email: AUTHENTICATED_REQUESTER.email,
  },
  description: "The retained Requester detail still works after authentication activation.",
  attachments: [{
    id: 9,
    ticketId: 42,
    originalName: "evidence.pdf",
    mimeType: "application/pdf",
    sizeBytes: 128,
    state: "ACTIVE" as const,
    createdAt: "2026-09-17T01:10:00.000Z",
    removedAt: null,
    removalReason: null,
    downloadUrl: "/api/tickets/42/attachments/9/download",
  }],
};

function json(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    blob: async () => new Blob(["bytes"]),
  } as Response;
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("UI-02 authenticated Requester continuity", () => {
  it("loads My Tickets from the authenticated session without a Requester selector/header", async () => {
    openAuthenticatedRequesterRoute("#/tickets");
    const fetchMock = vi.fn((input: RequestInfo | URL, _init?: RequestInit) => {
      const auth = authenticatedAppResponse(input);
      if (auth) return Promise.resolve(auth);
      const url = String(input);
      if (url.includes("/api/categories")) return Promise.resolve(json([category]));
      if (url.includes("/api/tickets")) {
        return Promise.resolve(json({ items: [listTicket], page: 1, pageSize: 10, totalItems: 1, totalPages: 1 }));
      }
      return Promise.reject(new Error(`unexpected fetch ${url}`));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(await screen.findByRole("heading", { name: "My Tickets" })).toBeInTheDocument();
    expect(screen.getByText(AUTHENTICATED_REQUESTER.name, { exact: true })).toBeInTheDocument();
    expect((await screen.findAllByText("Authenticated Requester continuity")).length).toBeGreaterThanOrEqual(1);
    expect((await screen.findAllByText("Reopened")).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/development requester/i)).not.toBeInTheDocument();

    const listCall = fetchMock.mock.calls.find(([input]) => String(input).includes("/api/tickets?"));
    expect(listCall?.[1]).toEqual(expect.objectContaining({ credentials: "include" }));
    expect(JSON.stringify(listCall?.[1] ?? {})).not.toMatch(/X-Development-Requester-Id/i);
  });

  it("creates a Ticket with CSRF/session transport and no client-controlled Requester identity", async () => {
    openAuthenticatedRequesterRoute("#/tickets/new");
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const auth = authenticatedAppResponse(input);
      if (auth) return Promise.resolve(auth);
      const url = String(input);
      if (url.includes("/api/categories")) return Promise.resolve(json([category]));
      if (url.includes("/api/related-systems")) return Promise.resolve(json([relatedSystem]));
      if (url.endsWith("/api/tickets") && init?.method === "POST") {
        return Promise.resolve(json({ ticket: detailTicket, replayed: false }, 201));
      }
      return Promise.reject(new Error(`unexpected fetch ${url}`));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    const user = userEvent.setup();
    await screen.findByRole("heading", { name: "Create Ticket" });
    await user.selectOptions(screen.getByRole("combobox", { name: "Category *" }), "2");
    await user.selectOptions(screen.getByRole("combobox", { name: "Related System *" }), "3");
    await user.type(screen.getByRole("textbox", { name: "Ticket Summary *" }), "Authenticated Requester continuity");
    await user.selectOptions(screen.getByRole("combobox", { name: "Requested Priority *" }), "HIGH");
    await user.type(screen.getByRole("textbox", { name: "Description *" }), "The retained Requester detail still works after authentication activation.");
    await user.click(within(screen.getByRole("region", { name: /create ticket/i })).getByRole("button", { name: "Create Ticket" }));

    expect(await screen.findByText("Your Ticket has been created.")).toBeInTheDocument();
    const createCall = fetchMock.mock.calls.find(([input, init]) => String(input).endsWith("/api/tickets") && init?.method === "POST");
    expect(createCall).toBeDefined();
    const init = createCall?.[1] as RequestInit;
    expect(init.credentials).toBe("include");
    expect(init.headers).toEqual({ "Content-Type": "application/json", "X-CSRF-Token": TEST_CSRF_TOKEN });
    const body = JSON.parse(String(init.body));
    expect(body.requesterId).toBeUndefined();
    expect(body.ownerId).toBeUndefined();
    expect(body.itPriority).toBeUndefined();
    expect(body.currentStatus).toBeUndefined();
  });

  it("renders owned Ticket detail and Attachment actions for a non-NEW status", async () => {
    openAuthenticatedRequesterRoute("#/tickets/42");
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const auth = authenticatedAppResponse(input);
      if (auth) return Promise.resolve(auth);
      const url = String(input);
      if (url.endsWith("/api/tickets/42")) return Promise.resolve(json({ ticket: detailTicket }));
      return Promise.reject(new Error(`unexpected fetch ${url}`));
    }));

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Ticket Detail" })).toBeInTheDocument();
    expect(screen.getByText("Authenticated Requester continuity")).toBeInTheDocument();
    expect(screen.getByText("Reopened")).toBeInTheDocument();
    expect(screen.getByText("evidence.pdf")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download evidence.pdf" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Remove attachment" })).toBeEnabled();
    expect(screen.queryByText(/development requester/i)).not.toBeInTheDocument();
  });
});
