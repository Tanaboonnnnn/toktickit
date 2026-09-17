import { useState } from "react";
import { roleLabel, useAuth } from "./auth-context.js";
import CreateTicketForm from "./CreateTicketForm.js";
import MyTickets from "./MyTickets.js";
import TicketDetail from "./TicketDetail.js";
import StaffTicketQueue from "./staff/StaffTicketQueue.js";
import StaffTicketDetail from "./staff/StaffTicketDetail.js";

function navigate(hash: string): void {
  window.location.hash = hash;
}

function AccessDenied() {
  return <section className="lab2-card lab3-route-state"><h1>Access Denied</h1><p>You do not have permission to open this page.</p></section>;
}

function NotFound() {
  return <section className="lab2-card lab3-route-state"><h1>Not Found</h1><p>The requested TokTickIT page does not exist.</p></section>;
}

function DeferredRoleHome({ title }: { title: string }) {
  return (
    <section className="lab2-card lab3-route-state">
      <h1>{title}</h1>
      <p>This authenticated role area is delivered by a later Lab 3 issue.</p>
    </section>
  );
}

function requesterRoute(route: string) {
  if (route === "#/tickets") return { kind: "list" } as const;
  if (route === "#/tickets/new") return { kind: "create" } as const;
  const match = /^#\/tickets\/([1-9]\d*)$/.exec(route);
  if (match) return { kind: "detail", ticketId: Number(match[1]) } as const;
  return null;
}

function staffRoute(route: string) {
  const [path, query = ""] = route.split("?", 2);
  if (path === "#/staff/tickets") return { kind: "queue", context: query } as const;
  const match = /^#\/staff\/tickets\/([1-9]\d*)$/.exec(path);
  if (match) return { kind: "detail", ticketId: Number(match[1]), context: query } as const;
  return null;
}

export default function AppShell({ route }: { route: string }) {
  const { user, logout } = useAuth();
  const [logoutError, setLogoutError] = useState("");
  const [logoutBusy, setLogoutBusy] = useState(false);

  if (!user) return null;

  async function handleLogout() {
    setLogoutBusy(true);
    setLogoutError("");
    try {
      await logout();
      navigate("#/login");
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : "Unable to log out. Please try again.");
    } finally {
      setLogoutBusy(false);
    }
  }

  const requestRoute = requesterRoute(route);
  let content;
  if (requestRoute) {
    content = user.role !== "REQUESTER"
      ? <AccessDenied />
      : requestRoute.kind === "list"
        ? <MyTickets onCreateTicket={() => navigate("#/tickets/new")} onViewTicket={(ticketId) => navigate(`#/tickets/${ticketId}`)} />
        : requestRoute.kind === "detail"
          ? <TicketDetail ticketId={requestRoute.ticketId} onBack={() => navigate("#/tickets")} />
          : <CreateTicketForm onViewTicket={(ticketId) => navigate(`#/tickets/${ticketId}`)} onMyTickets={() => navigate("#/tickets")} />;
  } else if (staffRoute(route)) {
    const staff = staffRoute(route)!;
    content = user.role === "IT_STAFF" || user.role === "ADMINISTRATOR"
      ? staff.kind === "queue"
        ? <StaffTicketQueue initialContext={staff.context} onViewTicket={(ticketId, context) => navigate(`#/staff/tickets/${ticketId}?${context}`)} />
        : <StaffTicketDetail ticketId={staff.ticketId} queueContext={staff.context} onBack={(context) => navigate(`#/staff/tickets${context ? `?${context}` : ""}`)} />
      : <AccessDenied />;
  } else if (route === "#/admin/users") {
    content = user.role === "ADMINISTRATOR"
      ? <DeferredRoleHome title="User Management" />
      : <AccessDenied />;
  } else if (/^#\/(staff\/tickets|admin\/users)\//.test(route)) {
    content = <NotFound />;
  } else {
    content = <NotFound />;
  }

  return (
    <div className="lab2-shell">
      <header className="lab2-shell-header">
        <div>
          <p className="lab2-brand">TokTickIT</p>
          <p className="lab2-muted">IT Service Desk</p>
        </div>
        <div className="lab2-context" aria-label="Current authenticated user">
          <span>Signed in as</span>
          <strong>{user.name}</strong>
          <small>{roleLabel(user.role)}</small>
        </div>
        <button className="lab2-button lab2-button-secondary" type="button" onClick={() => navigate("#/change-password")}>Change Password</button>
        <button className="lab2-button lab2-button-secondary" type="button" disabled={logoutBusy} onClick={() => { void handleLogout(); }}>
          {logoutBusy ? "Logging out..." : "Logout"}
        </button>
      </header>

      <nav className="lab2-navigation" aria-label="Primary navigation">
        {user.role === "REQUESTER" && <>
          <button type="button" className={`lab2-nav-item ${route === "#/tickets" ? "lab2-nav-item-active" : ""}`}
            aria-current={route === "#/tickets" ? "page" : undefined} onClick={() => navigate("#/tickets")}>My Tickets</button>
          <button type="button" className={`lab2-nav-item ${route === "#/tickets/new" ? "lab2-nav-item-active" : ""}`}
            aria-current={route === "#/tickets/new" ? "page" : undefined} onClick={() => navigate("#/tickets/new")}>Create Ticket</button>
        </>}
        {(user.role === "IT_STAFF" || user.role === "ADMINISTRATOR") && (
          <button type="button" className={`lab2-nav-item ${route.startsWith("#/staff/tickets") ? "lab2-nav-item-active" : ""}`}
            onClick={() => navigate("#/staff/tickets")}>Ticket Queue</button>
        )}
        {user.role === "ADMINISTRATOR" && (
          <button type="button" className={`lab2-nav-item ${route === "#/admin/users" ? "lab2-nav-item-active" : ""}`}
            aria-current={route === "#/admin/users" ? "page" : undefined} onClick={() => navigate("#/admin/users")}>Users</button>
        )}
      </nav>

      {logoutError && <div className="lab2-shell-content"><div className="lab2-error" role="alert">{logoutError}</div></div>}
      <main className="lab2-shell-content">{content}</main>
    </div>
  );
}
