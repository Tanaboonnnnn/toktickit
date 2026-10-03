import { useEffect, useRef, useState } from "react";
import { fetchTicketWorkflowHistory, type TicketWorkflowHistoryResponse } from "../api/workflow.js";
import { formatDisplayDate } from "../date-format.js";
import { ticketStatusLabel } from "../ticket-status.js";

type HistoryState =
  | { kind: "loading" }
  | { kind: "failure" }
  | { kind: "success"; response: TicketWorkflowHistoryResponse };

export default function TicketWorkflowHistory({ ticketId, ticketVersion, pageSize = 20 }: {
  ticketId: number;
  ticketVersion: number;
  pageSize?: number;
}) {
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<HistoryState>({ kind: "loading" });
  const generation = useRef(0);

  useEffect(() => { setPage(1); }, [ticketId]);

  useEffect(() => {
    const request = ++generation.current;
    setState({ kind: "loading" });
    void fetchTicketWorkflowHistory(ticketId, page, pageSize)
      .then((response) => { if (generation.current === request) setState({ kind: "success", response }); })
      .catch(() => { if (generation.current === request) setState({ kind: "failure" }); });
  }, [ticketId, ticketVersion, page, pageSize, retry]);

  const response = state.kind === "success" ? state.response : null;
  return <section className="lab2-readonly-section lab4-workflow-history" aria-labelledby={`workflow-history-heading-${ticketId}`}>
    <h2 id={`workflow-history-heading-${ticketId}`}>Ticket workflow history</h2>
    <p className="lab2-muted">Forward-only Ticket transitions recorded from Lab 4 onward.</p>
    {state.kind === "loading" && <p className="lab2-status" role="status">Loading Ticket workflow history...</p>}
    {state.kind === "failure" && <div className="lab2-error" role="alert"><p>Unable to load Ticket workflow history.</p><button type="button" className="lab2-button lab2-button-secondary" onClick={() => setRetry((value) => value + 1)}>Retry Ticket workflow history</button></div>}
    {response?.totalItems === 0 && <div className="lab2-muted"><p>No Lab 4 Ticket workflow events recorded yet.</p><p>Earlier Ticket transitions are not backfilled.</p></div>}
    {response && response.items.length > 0 && <div className="lab4-workflow-event-list">
      {response.items.map((event) => <article className="lab4-workflow-event" key={event.id}>
        <h3>{ticketStatusLabel(event.fromStatus)} → {ticketStatusLabel(event.toStatus)}</h3>
        <p>Changed by {event.actor.name} on {formatDisplayDate(event.occurredAt)}</p>
        <p>Work cycle {event.workflowCycle} · Ticket version {event.ticketVersion}</p>
        {event.resolutionSummary && <p><strong>Resolution Summary:</strong> {event.resolutionSummary}</p>}
        {event.cancellationReason && <p><strong>Cancellation Reason:</strong> {event.cancellationReason}</p>}
      </article>)}
    </div>}
    {response && response.totalPages > 1 && <nav className="lab2-pagination" aria-label="Ticket workflow history pagination">
      <button type="button" className="lab2-button lab2-button-secondary" disabled={response.page <= 1} onClick={() => setPage(response.page - 1)}>Previous workflow history page</button>
      <span>Page {response.page} of {response.totalPages} ({response.totalItems} total)</span>
      <button type="button" className="lab2-button lab2-button-secondary" disabled={response.page >= response.totalPages} onClick={() => setPage(response.page + 1)}>Next workflow history page</button>
    </nav>}
  </section>;
}
