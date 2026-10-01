import { useState } from "react";
import { roleLabel, useAuth } from "./auth-context.js";
import CreateTicketForm from "./CreateTicketForm.js";
import MyTickets from "./MyTickets.js";
import TicketDetail from "./TicketDetail.js";
import StaffTicketQueue from "./staff/StaffTicketQueue.js";
import StaffTicketDetail from "./staff/StaffTicketDetail.js";
import UserManagement from "./admin/UserManagement.js";
import RequesterDashboard from "./dashboard/RequesterDashboard.js";
import StaffDashboard from "./dashboard/StaffDashboard.js";
import { parseTicketListContext } from "./ticket-list-context.js";
import { parseStaffQueueContext } from "./staff/staff-queue-context.js";
import { staffQueueContext } from "./api/staff.js";

function navigate(hash: string): void {
  window.location.hash = hash;
}

function AccessDenied() {
  return <section className="lab2-card lab3-route-state"><h1>Access Denied</h1><p>You do not have permission to open this page.</p></section>;
}

function NotFound() {
  return <section className="lab2-card lab3-route-state"><h1>Not Found</h1><p>The requested TokTickIT page does not exist.</p></section>;
}

function requesterRoute(route: string) {
  const [path, context = ""] = route.split("?", 2);
  if (path === "#/dashboard" && !context) return { kind: "dashboard" } as const;
  if (path === "#/tickets" && parseTicketListContext(context)) return { kind: "list", context } as const;
  if (path === "#/tickets/new" && !context) return { kind: "create" } as const;
  const match = /^#\/tickets\/([1-9]\d*)$/.exec(path);
  if (match && parseTicketListContext(context)) return { kind: "detail", ticketId: Number(match[1]), context } as const;
  return null;
}

function staffRoute(route: string) {
  const [path, query = ""] = route.split("?", 2);
  if (path === "#/staff/dashboard" && !query) return { kind: "dashboard" } as const;
  if (path === "#/staff/tickets") {
    const parsed = parseStaffQueueContext(query);
    return parsed ? { kind: "queue", context: query } as const : null;
  }
  const match = /^#\/staff\/tickets\/([1-9]\d*)$/.exec(path);
  if (match) {
    const parsed = parseStaffQueueContext(query, true);
    return parsed ? { kind: "detail", ticketId: Number(match[1]), context: staffQueueContext(parsed.query), targetActionId: parsed.targetActionId } as const : null;
  }
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
      : requestRoute.kind === "dashboard"
        ? <RequesterDashboard />
        : requestRoute.kind === "list"
          ? <MyTickets initialContext={requestRoute.context} syncUrl onCreateTicket={() => navigate("#/tickets/new")} onViewTicket={(ticketId) => navigate(`#/tickets/${ticketId}${requestRoute.context ? `?${requestRoute.context}` : ""}`)} />
        : requestRoute.kind === "detail"
          ? <TicketDetail ticketId={requestRoute.ticketId} onBack={() => navigate(`#/tickets${requestRoute.context ? `?${requestRoute.context}` : ""}`)} />
          : <CreateTicketForm onViewTicket={(ticketId) => navigate(`#/tickets/${ticketId}`)} onMyTickets={() => navigate("#/tickets")} />;
  } else if (staffRoute(route)) {
    const staff = staffRoute(route)!;
    content = user.role === "IT_STAFF" || user.role === "ADMINISTRATOR"
      ? staff.kind === "dashboard"
        ? <StaffDashboard />
        : staff.kind === "queue"
          ? <StaffTicketQueue initialContext={staff.context} syncUrl onViewTicket={(ticketId, context) => navigate(`#/staff/tickets/${ticketId}?${context}`)} />
          : <StaffTicketDetail ticketId={staff.ticketId} queueContext={staff.context} targetActionId={staff.targetActionId} onBack={(context) => navigate(`#/staff/tickets${context ? `?${context}` : ""}`)} />
      : <AccessDenied />;
  } else if (route === "#/admin/users") {
    content = user.role === "ADMINISTRATOR"
      ? <UserManagement />
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
          <button type="button" className={`lab2-nav-item ${route === "#/dashboard" ? "lab2-nav-item-active" : ""}`}
            aria-current={route === "#/dashboard" ? "page" : undefined} onClick={() => navigate("#/dashboard")}>Dashboard</button>
          <button type="button" className={`lab2-nav-item ${route.startsWith("#/tickets") && !route.startsWith("#/tickets/new") ? "lab2-nav-item-active" : ""}`}
            aria-current={route.startsWith("#/tickets") && !route.startsWith("#/tickets/new") ? "page" : undefined} onClick={() => navigate("#/tickets")}>My Tickets</button>
          <button type="button" className={`lab2-nav-item ${route === "#/tickets/new" ? "lab2-nav-item-active" : ""}`}
            aria-current={route === "#/tickets/new" ? "page" : undefined} onClick={() => navigate("#/tickets/new")}>Create Ticket</button>
        </>}
        {(user.role === "IT_STAFF" || user.role === "ADMINISTRATOR") && (
          <>
            <button type="button" className={`lab2-nav-item ${route === "#/staff/dashboard" ? "lab2-nav-item-active" : ""}`}
              aria-current={route === "#/staff/dashboard" ? "page" : undefined} onClick={() => navigate("#/staff/dashboard")}>Dashboard</button>
            <button type="button" className={`lab2-nav-item ${route.startsWith("#/staff/tickets") ? "lab2-nav-item-active" : ""}`}
              aria-current={route.startsWith("#/staff/tickets") ? "page" : undefined} onClick={() => navigate("#/staff/tickets")}>Ticket Queue</button>
          </>
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
