import { useEffect, useState } from "react";
import { fetchStaffDashboard, type StaffDashboardResponse } from "../api/dashboard.js";
import { SafeApiError } from "../api.js";
import { useAuth } from "../auth-context.js";
import { formatDisplayDate } from "../date-format.js";
import { ticketStatusLabel } from "../ticket-status.js";

type State = { kind: "loading" } | { kind: "forbidden" } | { kind: "failure"; message: string } | { kind: "success"; data: StaffDashboardResponse };
const attributionLabel = { RECORDED: "Recorded", ASSIGNED: "Assigned", PERFORMED: "Performed" } as const;
const actionStatusLabel = { PENDING: "Pending", IN_PROGRESS: "In Progress", COMPLETED: "Completed", CANCELLED: "Cancelled" } as const;

export default function StaffDashboard() {
  const { user } = useAuth();
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<State>({ kind: "loading" });
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setState({ kind: "loading" });
    void fetchStaffDashboard(controller.signal).then((data) => { if (active) setState({ kind: "success", data }); }).catch((error: unknown) => {
      if (!active) return;
      if (error instanceof SafeApiError && error.status === 403) setState({ kind: "forbidden" });
      else setState({ kind: "failure", message: error instanceof SafeApiError ? error.message : "Unable to load Staff Dashboard. Please try again." });
    });
    return () => { active = false; controller.abort(); };
  }, [user?.id, retry]);

  return <section className="lab4-dashboard" aria-labelledby="staff-dashboard-heading">
    <h1 id="staff-dashboard-heading">Staff Dashboard</h1>
    {state.kind === "loading" && <p className="lab2-status" role="status">Loading Dashboard…</p>}
    {state.kind === "forbidden" && <div className="lab2-error" role="alert"><h2>Access Denied</h2><p>You do not have permission to open Staff Dashboard.</p></div>}
    {state.kind === "failure" && <div className="lab2-error" role="alert"><p>{state.message}</p><button className="lab2-button lab2-button-secondary" type="button" onClick={() => setRetry((value) => value + 1)}>Retry</button></div>}
    {state.kind === "success" && <>
      <div className="lab4-dashboard-metrics">
        <Metric label="Unassigned active" value={state.data.metrics.unassignedActive} href={state.data.drillDown.unassignedActive} />
        <Metric label="My active Tickets" value={state.data.metrics.myActiveTickets} href={state.data.drillDown.myActiveTickets} />
        <Metric label="High-priority active" value={state.data.metrics.highPriorityActive} href={state.data.drillDown.highPriorityActive} />
        <Metric label="Waiting for Requester" value={state.data.metrics.waitingForRequester} href={state.data.drillDown.waitingForRequester} />
      </div>
      <section aria-labelledby="staff-recent-tickets-heading"><h2 id="staff-recent-tickets-heading">Recently updated Tickets</h2>
        {state.data.recentTickets.length === 0 ? <p className="lab2-muted">No recently updated Tickets.</p> : <ul className="lab4-dashboard-list">{state.data.recentTickets.map((ticket) => <li key={ticket.id}>
          <a href={`#/staff/tickets/${ticket.id}`}><strong>{ticket.ticketNumber}</strong> — {ticket.summary}</a>
          <span>{ticketStatusLabel(ticket.currentStatus)} · Updated {formatDisplayDate(ticket.updatedAt)}</span>
        </li>)}</ul>}
      </section>
      <section aria-labelledby="my-actions-heading"><h2 id="my-actions-heading">My Actions</h2>
        {state.data.myActions.length === 0 ? <p className="lab2-muted">No Actions are associated with you yet.</p> : <ul className="lab4-dashboard-list">{state.data.myActions.map(({ action, ticket, attribution }) => <li key={action.id}>
          <a href={`#/staff/tickets/${ticket.id}?actionId=${action.id}`}><strong>{ticket.ticketNumber}</strong> — {ticket.summary}: {action.description}</a>
          <span>{actionStatusLabel[action.status]} · {attribution.map((item) => attributionLabel[item]).join(" · ")}</span>
        </li>)}</ul>}
      </section>
    </>}
  </section>;
}

function Metric({ label, value, href }: { label: string; value: number; href: string }) {
  return <article className="lab4-dashboard-metric"><h2>{label}</h2><p className="lab4-dashboard-value">{value}</p><a className="lab2-button lab2-button-secondary" href={href}>View {label.toLowerCase()}</a></article>;
}
