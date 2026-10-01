import { useEffect, useState } from "react";
import { fetchRequesterDashboard, type RequesterDashboardResponse } from "../api/dashboard.js";
import { SafeApiError } from "../api.js";
import { useAuth } from "../auth-context.js";
import { formatDisplayDate } from "../date-format.js";
import { ticketStatusLabel } from "../ticket-status.js";

type State = { kind: "loading" } | { kind: "forbidden" } | { kind: "failure"; message: string } | { kind: "success"; data: RequesterDashboardResponse };

export default function RequesterDashboard() {
  const { user } = useAuth();
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<State>({ kind: "loading" });
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setState({ kind: "loading" });
    void fetchRequesterDashboard(controller.signal).then((data) => { if (active) setState({ kind: "success", data }); }).catch((error: unknown) => {
      if (!active) return;
      if (error instanceof SafeApiError && error.status === 403) setState({ kind: "forbidden" });
      else setState({ kind: "failure", message: error instanceof SafeApiError ? error.message : "Unable to load your Dashboard. Please try again." });
    });
    return () => { active = false; controller.abort(); };
  }, [user?.id, retry]);

  return <section className="lab4-dashboard" aria-labelledby="requester-dashboard-heading">
    <h1 id="requester-dashboard-heading">Dashboard</h1>
    {state.kind === "loading" && <p className="lab2-status" role="status">Loading Dashboard…</p>}
    {state.kind === "forbidden" && <div className="lab2-error" role="alert"><h2>Access Denied</h2><p>You do not have permission to open your Dashboard.</p></div>}
    {state.kind === "failure" && <div className="lab2-error" role="alert"><p>{state.message}</p><button className="lab2-button lab2-button-secondary" type="button" onClick={() => setRetry((value) => value + 1)}>Retry</button></div>}
    {state.kind === "success" && <>
      <div className="lab4-dashboard-metrics">
        <Metric label="My active Tickets" value={state.data.metrics.myActiveTickets} href={state.data.drillDown.myActiveTickets} />
        <Metric label="Waiting for me" value={state.data.metrics.waitingForMe} href={state.data.drillDown.waitingForMe} />
        <Metric label="Recently resolved" value={state.data.metrics.recentlyResolved} href={state.data.drillDown.recentlyResolved} />
      </div>
      <section aria-labelledby="recent-tickets-heading"><h2 id="recent-tickets-heading">Recently updated</h2>
        {state.data.recentTickets.length === 0 ? <p className="lab2-muted">No recently updated Tickets.</p> : <ul className="lab4-dashboard-list">{state.data.recentTickets.map((ticket) => <li key={ticket.id}>
          <a href={`#/tickets/${ticket.id}`}><strong>{ticket.ticketNumber}</strong> — {ticket.summary}</a>
          <span>{ticketStatusLabel(ticket.currentStatus)} · Updated {formatDisplayDate(ticket.updatedAt)}</span>
        </li>)}</ul>}
      </section>
      <section aria-labelledby="attention-tickets-heading"><h2 id="attention-tickets-heading">Needs your attention</h2>
        {state.data.attentionTickets.length === 0 ? <p className="lab2-muted">No Tickets are waiting for your response.</p> : <ul className="lab4-dashboard-list">{state.data.attentionTickets.map((ticket) => <li key={ticket.id}>
          <a href={`#/tickets/${ticket.id}`}><strong>{ticket.ticketNumber}</strong> — {ticket.summary}</a>
          <span>{ticketStatusLabel(ticket.currentStatus)} · Updated {formatDisplayDate(ticket.updatedAt)}</span>
        </li>)}</ul>}
      </section>
    </>}
  </section>;
}

function Metric({ label, value, href }: { label: string; value: number; href: string }) {
  return <article className="lab4-dashboard-metric"><h2>{label}</h2><p className="lab4-dashboard-value">{value}</p><a className="lab2-button lab2-button-secondary" href={href}>View {label.toLowerCase()}</a></article>;
}
