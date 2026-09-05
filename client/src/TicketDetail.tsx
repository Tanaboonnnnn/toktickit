import { useEffect, useState } from "react";
import { fetchTicketDetail, SafeApiError, type Ticket } from "./api.js";
import { useRequesterContext } from "./requester-context.js";
import AttachmentPanel from "./AttachmentPanel.js";
import { formatDisplayDate } from "./date-format.js";

type DetailState =
  | { kind: "loading" }
  | { kind: "success"; ticket: Ticket; key: string }
  | { kind: "unavailable"; key: string }
  | { kind: "failure"; message: string; key: string };

interface TicketDetailProps {
  ticketId: number;
  onBack: () => void;
}

function formatDate(value: string): string {
  return formatDisplayDate(value);
}

function formatSize(sizeBytes: number): string {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function priorityLabel(priority: Ticket["requestedPriority"]): string {
  return `${priority.charAt(0)}${priority.slice(1).toLowerCase()}`;
}

export default function TicketDetail({ ticketId, onBack }: TicketDetailProps) {
  const { currentRequester } = useRequesterContext();
  const requesterId = currentRequester?.id;
  const [state, setState] = useState<DetailState>({ kind: "loading" });
  const [retryToken, setRetryToken] = useState(0);
  const requestKey = `${requesterId ?? "none"}:${ticketId}`;

  useEffect(() => {
    if (!requesterId) return;
    let active = true;
    setState({ kind: "loading" });
    void fetchTicketDetail(requesterId, ticketId)
      .then((ticket) => { if (active) setState({ kind: "success", ticket, key: requestKey }); })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof SafeApiError && error.status === 404 && error.code === "RESOURCE_NOT_FOUND") {
          setState({ kind: "unavailable", key: requestKey });
          return;
        }
        // Keep persistence/response internals out of the UI even if a server
        // returns an unsafe message or a malformed error object.
        setState({ kind: "failure", message: "Unable to load ticket", key: requestKey });
      });
    return () => { active = false; };
  }, [requesterId, ticketId, retryToken]);

  const visibleState: DetailState = state.kind !== "loading" && state.key !== requestKey
    ? { kind: "loading" }
    : state;

  const reloadTicket = () => setRetryToken((token) => token + 1);
  return (
    <section className="lab2-ticket-detail" aria-labelledby="ticket-detail-heading">
      <div className="lab2-detail-heading">
        <button type="button" className="lab2-button lab2-button-secondary" onClick={onBack}>Back to My Tickets</button>
        <h1 id="ticket-detail-heading">Ticket Detail</h1>
      </div>

      {visibleState.kind === "loading" && <p className="lab2-status" role="status">Loading ticket...</p>}
      {visibleState.kind === "unavailable" && (
        <div className="lab2-status" role="status">
          <h2>Ticket unavailable</h2>
          <p>This Ticket is unavailable.</p>
        </div>
      )}
      {visibleState.kind === "failure" && (
        <div className="lab2-error" role="alert">
          <p>{visibleState.message}</p>
          <button type="button" className="lab2-button lab2-button-secondary" onClick={() => setRetryToken((token) => token + 1)}>Retry</button>
        </div>
      )}
      {visibleState.kind === "success" && <TicketContents ticket={visibleState.ticket} onRefresh={reloadTicket} />}
    </section>
  );
}

function TicketContents({ ticket, onRefresh }: { ticket: Ticket; onRefresh: () => void }) {
  return (
    <>
      <section className="lab2-readonly-section" aria-labelledby="ticket-information-heading">
        <h2 id="ticket-information-heading">Ticket information</h2>
        <dl className="lab2-detail-grid">
          <dt>Ticket Number</dt><dd>{ticket.ticketNumber}</dd>
          <dt>Current Status</dt><dd><span className="lab2-badge lab2-status-new">New</span></dd>
          <dt>Ticket Date</dt><dd>{formatDate(ticket.createdAt)}</dd>
          <dt>Last Updated</dt><dd>{formatDate(ticket.updatedAt)}</dd>
          <dt>Requester</dt><dd>{ticket.requester.name} ({ticket.requester.email})</dd>
          <dt>Category</dt><dd>{ticket.category.name}</dd>
          <dt>Related System</dt><dd>{ticket.relatedSystem.name}</dd>
          <dt>Ticket Summary</dt><dd>{ticket.summary}</dd>
          <dt>Requested Priority</dt><dd><span className={`lab2-badge lab2-priority-${ticket.requestedPriority.toLowerCase()}`}>{priorityLabel(ticket.requestedPriority)}</span></dd>
          <dt>Description</dt><dd className="lab2-detail-description">{ticket.description}</dd>
        </dl>
      </section>

      <AttachmentPanel ticket={ticket} onRefresh={onRefresh} />
    </>
  );
}
