import { useEffect, useState } from "react";
import { downloadAttachment, SafeApiError } from "../api.js";
import { fetchStaffTicketDetail, type StaffTicketDetail as StaffDetail } from "../api/staff.js";
import { formatDisplayDate } from "../date-format.js";
import { ticketStatusClassName, ticketStatusLabel } from "../ticket-status.js";

type State = { kind: "loading" } | { kind: "missing" } | { kind: "forbidden" } | { kind: "failure" } | { kind: "success"; ticket: StaffDetail };
const priorityLabel = (v: string) => v[0] + v.slice(1).toLowerCase();
export default function StaffTicketDetail({ ticketId, queueContext, onBack }: { ticketId: number; queueContext: string; onBack: (context: string) => void }) {
  const [state, setState] = useState<State>({ kind: "loading" }); const [retry, setRetry] = useState(0);
  useEffect(() => { let active = true; setState({ kind: "loading" }); void fetchStaffTicketDetail(ticketId).then((ticket) => { if (active) setState({ kind: "success", ticket }); }).catch((e: unknown) => { if (!active) return; if (e instanceof SafeApiError && e.status === 404) setState({ kind: "missing" }); else if (e instanceof SafeApiError && e.status === 403) setState({ kind: "forbidden" }); else setState({ kind: "failure" }); }); return () => { active = false; }; }, [ticketId, retry]);
  return <section className="lab2-ticket-detail" aria-labelledby="staff-detail-heading"><div className="lab2-detail-heading"><button className="lab2-button lab2-button-secondary" type="button" onClick={() => onBack(queueContext)}>Back to Ticket Queue</button><h1 id="staff-detail-heading">Staff Ticket Detail</h1></div>
    {state.kind === "loading" && <p className="lab2-status" role="status">Loading ticket...</p>}
    {state.kind === "missing" && <div className="lab2-status" role="status"><h2>Ticket unavailable</h2><p>This Ticket is unavailable.</p></div>}
    {state.kind === "forbidden" && <div className="lab2-error" role="alert"><h2>Access Denied</h2><p>You do not have permission to open this Ticket.</p></div>}
    {state.kind === "failure" && <div className="lab2-error" role="alert"><p>Unable to load Staff Ticket Detail</p><button className="lab2-button lab2-button-secondary" type="button" onClick={() => setRetry((v) => v + 1)}>Retry</button></div>}
    {state.kind === "success" && <Contents ticket={state.ticket} />}
  </section>;
}
function Contents({ ticket: t }: { ticket: StaffDetail }) { return <><section className="lab2-readonly-section"><h2>Ticket information</h2><dl className="lab2-detail-grid"><dt>Ticket Number</dt><dd>{t.ticketNumber}</dd><dt>Current Status</dt><dd><span className={`lab2-badge ${ticketStatusClassName(t.currentStatus)}`}>{ticketStatusLabel(t.currentStatus)}</span></dd><dt>Created</dt><dd>{formatDisplayDate(t.createdAt)}</dd><dt>Last Updated</dt><dd>{formatDisplayDate(t.updatedAt)}</dd><dt>Requester</dt><dd>{t.requester.name} ({t.requester.email})</dd><dt>Category</dt><dd>{t.category.name}</dd><dt>Related System</dt><dd>{t.relatedSystem.name}</dd><dt>Summary</dt><dd>{t.summary}</dd><dt>Requested Priority</dt><dd>{priorityLabel(t.requestedPriority)}</dd><dt>IT Priority</dt><dd>{priorityLabel(t.itPriority)}</dd><dt>Owner</dt><dd>{t.owner?.name ?? "Unassigned"}</dd><dt>Description</dt><dd className="lab2-detail-description">{t.description}</dd></dl></section><section className="lab2-attachments-section"><h2>Attachments</h2>{t.attachments.length === 0 ? <p className="lab2-muted">No attachments.</p> : <div className="lab2-attachment-list">{t.attachments.map((a) => <article className="lab2-attachment-card" key={a.id}><h3>{a.originalName}</h3><p>{a.state === "REMOVED" ? "Removed" : "Available"}</p>{a.downloadUrl && <button className="lab2-button lab2-button-secondary" type="button" onClick={() => { void downloadAttachment(t.id, a.id, a.originalName); }}>Download</button>}</article>)}</div>}</section></>; }
