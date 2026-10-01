import { useEffect, useRef, useState } from "react";
import { downloadAttachment, SafeApiError } from "../api.js";
import { fetchStaffTicketDetail, type StaffTicketDetail as StaffDetail } from "../api/staff.js";
import ActionsTaken from "../actions/ActionsTaken.js";
import TicketWorkflowHistory from "../workflow/TicketWorkflowHistory.js";
import { formatDisplayDate } from "../date-format.js";
import { ticketStatusClassName, ticketStatusLabel } from "../ticket-status.js";
import TicketOperations from "./TicketOperations.js";
import PublicComments from "../communication/PublicComments.js";
import InternalNotes from "../communication/InternalNotes.js";

type State = { kind: "loading" } | { kind: "missing" } | { kind: "forbidden" } | { kind: "failure" } | { kind: "success"; ticket: StaffDetail };
const priorityLabel = (v: string) => v[0] + v.slice(1).toLowerCase();
export default function StaffTicketDetail({ ticketId, queueContext, targetActionId, onBack }: { ticketId: number; queueContext: string; targetActionId?: number; onBack: (context: string) => void }) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [retry, setRetry] = useState(0);
  const [conflict, setConflict] = useState("");
  const requestGeneration = useRef(0);
  useEffect(() => {
    const generation = ++requestGeneration.current;
    setState({ kind: "loading" }); setConflict("");
    void fetchStaffTicketDetail(ticketId).then((ticket) => { if (requestGeneration.current === generation) setState({ kind: "success", ticket }); }).catch((e: unknown) => {
      if (requestGeneration.current !== generation) return;
      if (e instanceof SafeApiError && e.status === 404) setState({ kind: "missing" });
      else if (e instanceof SafeApiError && e.status === 403) setState({ kind: "forbidden" });
      else setState({ kind: "failure" });
    });
    return () => { if (requestGeneration.current === generation) requestGeneration.current += 1; };
  }, [ticketId, retry]);

  async function reloadTicket(message = ""): Promise<number | void> {
    const generation = ++requestGeneration.current;
    try {
      const ticket = await fetchStaffTicketDetail(ticketId);
      if (requestGeneration.current !== generation) return;
      setState({ kind: "success", ticket });
      setConflict(message);
      return ticket.version;
    } catch {
      if (requestGeneration.current === generation) setState({ kind: "failure" });
    }
  }

  async function reloadAfterConflict(): Promise<number | void> {
    return reloadTicket("Ticket changed on the server. The latest state was reloaded; review it before deliberately applying another action.");
  }

  async function reloadAfterAction(): Promise<void> {
    await reloadTicket("");
  }

  return <section className="lab2-ticket-detail" aria-labelledby="staff-detail-heading"><div className="lab2-detail-heading"><button className="lab2-button lab2-button-secondary" type="button" onClick={() => onBack(queueContext)}>Back to Ticket Queue</button><h1 id="staff-detail-heading">Staff Ticket Detail</h1></div>
    {conflict && <div className="lab2-error" role="alert">{conflict}</div>}
    {state.kind === "loading" && <p className="lab2-status" role="status">Loading ticket...</p>}
    {state.kind === "missing" && <div className="lab2-status" role="status"><h2>Ticket unavailable</h2><p>This Ticket is unavailable.</p></div>}
    {state.kind === "forbidden" && <div className="lab2-error" role="alert"><h2>Access Denied</h2><p>You do not have permission to open this Ticket.</p></div>}
    {state.kind === "failure" && <div className="lab2-error" role="alert"><p>Unable to load Staff Ticket Detail</p><button className="lab2-button lab2-button-secondary" type="button" onClick={() => setRetry((v) => v + 1)}>Retry</button></div>}
    {state.kind === "success" && <Contents ticket={state.ticket} targetActionId={targetActionId} onUpdated={(ticket) => { requestGeneration.current += 1; setState({ kind: "success", ticket }); setConflict(""); }} onConflict={reloadAfterConflict} onActionUpdated={reloadAfterAction} />}
  </section>;
}
function Contents({ ticket: t, targetActionId, onUpdated, onConflict, onActionUpdated }: { ticket: StaffDetail; targetActionId?: number; onUpdated: (ticket: StaffDetail) => void; onConflict: () => Promise<number | void>; onActionUpdated: () => Promise<void> }) {
  const [downloadError, setDownloadError] = useState("");
  async function handleDownload(id: number, originalName: string) {
    setDownloadError("");
    try {
      await downloadAttachment(t.id, id, originalName);
    } catch {
      setDownloadError(`Unable to download ${originalName}. Please try again.`);
    }
  }
  return <><section className="lab2-readonly-section"><h2>Ticket information</h2><dl className="lab2-detail-grid"><dt>Ticket Number</dt><dd>{t.ticketNumber}</dd><dt>Current Status</dt><dd><span className={`lab2-badge ${ticketStatusClassName(t.currentStatus)}`}>{ticketStatusLabel(t.currentStatus)}</span></dd><dt>Created</dt><dd>{formatDisplayDate(t.createdAt)}</dd><dt>Last Updated</dt><dd>{formatDisplayDate(t.updatedAt)}</dd><dt>Requester</dt><dd>{t.requester.name} ({t.requester.email})</dd><dt>Category</dt><dd>{t.category.name}</dd><dt>Related System</dt><dd>{t.relatedSystem.name}</dd><dt>Summary</dt><dd>{t.summary}</dd><dt>Requested Priority</dt><dd>{priorityLabel(t.requestedPriority)}</dd><dt>IT Priority</dt><dd>{priorityLabel(t.itPriority)}</dd><dt>Owner</dt><dd>{t.owner?.name ?? "Unassigned"}</dd><dt>Description</dt><dd className="lab2-detail-description">{t.description}</dd></dl></section>
    <TicketOperations ticket={t} onUpdated={onUpdated} onConflict={async () => { await onConflict(); }} />
    <section className="lab2-attachments-section"><h2>Attachments</h2>{downloadError && <div className="lab2-error" role="alert">{downloadError}</div>}{t.attachments.length === 0 ? <p className="lab2-muted">No attachments.</p> : <div className="lab2-attachment-list">{t.attachments.map((a) => <article className="lab2-attachment-card" key={a.id}><h3>{a.originalName}</h3><p>{a.state === "REMOVED" ? "Removed" : "Available"}</p>{a.downloadUrl && <button className="lab2-button lab2-button-secondary" type="button" aria-label={`Download ${a.originalName}`} onClick={() => { void handleDownload(a.id, a.originalName); }}>Download</button>}</article>)}</div>}</section>
    <PublicComments ticketId={t.id} />
    <InternalNotes ticketId={t.id} />
    <ActionsTaken mode="staff" ticketId={t.id} ticketNumber={t.ticketNumber} ticketVersion={t.version} targetActionId={targetActionId} onTicketChanged={() => onActionUpdated()} onConflict={onConflict} />
    <TicketWorkflowHistory ticketId={t.id} ticketVersion={t.version} />
  </>;
}
