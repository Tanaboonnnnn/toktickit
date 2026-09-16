export const AUTHENTICATED_REQUESTER = {
  id: 1,
  name: "Anan Student",
  email: "anan.student@example.test",
  role: "REQUESTER" as const,
  mustChangePassword: false,
};

export const TEST_CSRF_TOKEN = "csrf-requester-regression";

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

export function authenticatedAppResponse(input: RequestInfo | URL): Response | undefined {
  const url = String(input);
  if (url.endsWith("/api/auth/me")) return jsonResponse({ user: AUTHENTICATED_REQUESTER });
  if (url.endsWith("/api/auth/csrf")) return jsonResponse({ csrfToken: TEST_CSRF_TOKEN });
  return undefined;
}

export function openAuthenticatedRequesterRoute(route = "#/tickets/new"): void {
  window.location.hash = route;
  localStorage.removeItem("toktickit.developmentRequesterId");
  sessionStorage.removeItem("toktickit.developmentRequesterId");
}
