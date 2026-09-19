import { useEffect, useMemo, useState } from "react";
import { SafeApiError, type RequestedPriority } from "../api.js";
import {
  claimStaffTicket,
  fetchStaffAssignees,
  updateStaffOwner,
  updateStaffPriority,
  updateStaffStatus,
  type StaffTicketDetail,
  type StaffUserSummary,
} from "../api/staff.js";
import { ticketStatusLabel, type TicketStatus } from "../ticket-status.js";

const nextStatuses: Record<TicketStatus, readonly TicketStatus[]> = {
  NEW: ["OPEN", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["OPEN", "IN_PROGRESS", "CANCELLED"],
  CANCELLED: [],
};

export default function TicketOperations({ ticket, onUpdated, onConflict }: {
  ticket: StaffTicketDetail;
  onUpdated: (ticket: StaffTicketDetail) => void;
  onConflict: () => Promise<void>;
}) {
  const [assignees, setAssignees] = useState<StaffUserSummary[]>([]);
  const [ownerId, setOwnerId] = useState(ticket.owner ? String(ticket.owner.id) : "");
  const [itPriority, setItPriority] = useState<RequestedPriority>(ticket.itPriority);
  const [nextStatus, setNextStatus] = useState<TicketStatus | "">("");
  const [resolutionSummary, setResolutionSummary] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [ownerConfirmed, setOwnerConfirmed] = useState(false);
  const [statusConfirmed, setStatusConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setOwnerId(ticket.owner ? String(ticket.owner.id) : "");
    setItPriority(ticket.itPriority);
    setNextStatus(""); setResolutionSummary(""); setCancelReason(""); setOwnerConfirmed(false); setStatusConfirmed(false);
  }, [ticket]);

  useEffect(() => {
    let active = true;
    void fetchStaffAssignees().then((items) => { if (active) setAssignees(items); }).catch(() => { if (active) setError("Unable to load eligible assignees"); });
    return () => { active = false; };
  }, []);

  async function run(action: () => Promise<StaffTicketDetail>, success: string) {
    setPending(true); setError(""); setFeedback("");
    try {
      const updated = await action();
      onUpdated(updated);
      setFeedback(success);
    } catch (caught) {
      if (caught instanceof SafeApiError && caught.status === 409) {
        await onConflict();
      } else if (caught instanceof SafeApiError) {
        setError(caught.message);
      } else {
        setError("Unable to complete the Ticket operation");
      }
    } finally {
      setPending(false);
    }
  }

  const permittedNextStatuses = ticket.owner ? nextStatuses[ticket.currentStatus] : nextStatuses[ticket.currentStatus].filter((status) => status === "CANCELLED");
  const ownerChanged = ownerId !== (ticket.owner ? String(ticket.owner.id) : "");
  const mayUnassign = ticket.currentStatus === "NEW" || ticket.currentStatus === "CLOSED" || ticket.currentStatus === "CANCELLED";
  const ownerValue = ownerId === "" ? null : Number(ownerId);
  const selectedOwnerName = ownerValue === null ? "Unassigned" : assignees.find((owner) => owner.id === ownerValue)?.name ?? "Selected owner";
  const statusNeedsConfirmation = nextStatus === "RESOLVED" || nextStatus === "CLOSED" || nextStatus === "REOPENED" || nextStatus === "CANCELLED";
  const canSaveStatus = useMemo(() => {
    if (!nextStatus) return false;
    if (statusNeedsConfirmation && !statusConfirmed) return false;
    if (nextStatus === "RESOLVED") { const n = Array.from(resolutionSummary.trim()).length; return n >= 10 && n <= 2000; }
    if (nextStatus === "CANCELLED") { const n = Array.from(cancelReason.trim()).length; return n >= 3 && n <= 200; }
    return true;
  }, [nextStatus, statusNeedsConfirmation, statusConfirmed, resolutionSummary, cancelReason]);

  return <section className="lab2-readonly-section lab3-ticket-operations" aria-labelledby="ticket-operations-heading">
    <h2 id="ticket-operations-heading">Ticket operations</h2>
    {feedback && <p className="lab2-status" role="status">{feedback}</p>}
    {error && <p className="lab2-error" role="alert">{error}</p>}

    <div className="lab3-operation-grid">
      <div className="lab2-field">
        <label htmlFor="staff-owner">Owner</label>
        <select id="staff-owner" value={ownerId} disabled={pending} onChange={(event) => { setOwnerId(event.target.value); setOwnerConfirmed(false); }}>
          {mayUnassign && <option value="">Unassigned</option>}
          {!mayUnassign && !ticket.owner && <option value="">Select eligible owner</option>}
          {assignees.map((owner) => <option key={owner.id} value={owner.id}>{owner.name} ({owner.role === "ADMINISTRATOR" ? "Administrator" : "IT Staff"})</option>)}
        </select>
        {ticket.owner === null && ticket.currentStatus !== "CLOSED" && ticket.currentStatus !== "CANCELLED" &&
          <button className="lab2-button lab2-button-primary" type="button" disabled={pending} onClick={() => void run(() => claimStaffTicket(ticket.id, ticket.version), "Ticket claimed successfully")}>Claim ticket</button>}
        {ownerChanged && <>
          <p className="lab2-muted">Confirm owner change for {ticket.ticketNumber} while status is {ticketStatusLabel(ticket.currentStatus)} to {selectedOwnerName}. This changes the primary Ticket Owner only.</p>
          <label className="lab3-confirm"><input type="checkbox" checked={ownerConfirmed} onChange={(e) => setOwnerConfirmed(e.target.checked)} /> Confirm owner change</label>
          <button className="lab2-button lab2-button-secondary" type="button" disabled={pending || !ownerConfirmed || (ownerValue === null && !mayUnassign)} onClick={() => void run(() => updateStaffOwner(ticket.id, ownerValue, ticket.version), ownerValue === null ? "Ticket unassigned successfully" : "Ticket owner updated successfully")}>{ownerValue === null ? "Unassign owner" : "Reassign owner"}</button>
        </>}
      </div>

      <div className="lab2-field">
        <label htmlFor="staff-priority">IT Priority</label>
        <select id="staff-priority" value={itPriority} disabled={pending || ticket.currentStatus === "CLOSED" || ticket.currentStatus === "CANCELLED"} onChange={(e) => setItPriority(e.target.value as RequestedPriority)}>
          <option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option>
        </select>
        <button className="lab2-button lab2-button-secondary" type="button" disabled={pending || itPriority === ticket.itPriority || ticket.currentStatus === "CLOSED" || ticket.currentStatus === "CANCELLED"} onClick={() => void run(() => updateStaffPriority(ticket.id, itPriority, ticket.version), "IT Priority updated successfully")}>Save IT Priority</button>
      </div>

      <div className="lab2-field lab3-status-operation">
        <label htmlFor="staff-next-status">Next status</label>
        <select id="staff-next-status" value={nextStatus} disabled={pending || permittedNextStatuses.length === 0} onChange={(e) => { setNextStatus(e.target.value as TicketStatus | ""); setStatusConfirmed(false); }}>
          <option value="">Select permitted status</option>
          {permittedNextStatuses.map((status) => <option key={status} value={status}>{ticketStatusLabel(status)}</option>)}
        </select>
        {nextStatus === "RESOLVED" && <><label htmlFor="resolution-summary">Resolution Summary</label><textarea id="resolution-summary" value={resolutionSummary} maxLength={2000} onChange={(e) => setResolutionSummary(e.target.value)} /></>}
        {nextStatus === "CANCELLED" && <><label htmlFor="cancel-reason">Cancel reason</label><textarea id="cancel-reason" value={cancelReason} maxLength={200} onChange={(e) => setCancelReason(e.target.value)} /></>}
        {statusNeedsConfirmation && <>
          <p className="lab2-muted">Confirm {ticket.ticketNumber}: {ticketStatusLabel(ticket.currentStatus)} → {nextStatus ? ticketStatusLabel(nextStatus) : ""}. This updates the formal Ticket workflow.</p>
          <label className="lab3-confirm"><input type="checkbox" checked={statusConfirmed} onChange={(e) => setStatusConfirmed(e.target.checked)} /> Confirm transition and consequence</label>
        </>}
        {nextStatus && <button className="lab2-button lab2-button-primary" type="button" disabled={pending || !canSaveStatus} onClick={() => void run(() => updateStaffStatus(ticket.id, {
          status: nextStatus as TicketStatus,
          expectedVersion: ticket.version,
          ...(statusNeedsConfirmation ? { confirmed: true } : {}),
          ...(nextStatus === "RESOLVED" ? { resolutionSummary } : {}),
          ...(nextStatus === "CANCELLED" ? { cancelReason } : {}),
        }), "Ticket status updated successfully")}>Confirm status change</button>}
      </div>
    </div>
    {pending && <p className="lab2-status" role="status">Saving Ticket operation...</p>}
  </section>;
}
