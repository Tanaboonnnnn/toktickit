import { useState } from "react";
import type { Ticket } from "../api.js";
import { indicateProblemResolved } from "../api/communication.js";

const allowed = new Set<Ticket["currentStatus"]>(["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"]);

export default function ResolutionIndication({ ticket, onIndicated }: { ticket: Ticket; onIndicated: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  if (ticket.requesterResolutionIndicatedAt) {
    return <section className="lab3-resolution-indication" aria-label="Problem Appears Resolved"><p className="lab2-success" role="status">Resolution indication sent. IT Staff will still perform any formal Resolved/Closed status change.</p></section>;
  }
  if (!allowed.has(ticket.currentStatus)) return null;

  async function submit() {
    setSaving(true); setError("");
    try { await indicateProblemResolved(ticket.id, ticket.version); onIndicated(); }
    catch { setError("Unable to send the resolution indication. Reload the Ticket and try again."); }
    finally { setSaving(false); }
  }

  return <section className="lab3-resolution-indication" aria-label="Problem Appears Resolved">
    {!confirming
      ? <button type="button" className="lab2-button lab2-button-secondary" onClick={() => setConfirming(true)}>Problem Appears Resolved</button>
      : <div className="lab2-warning"><p>This tells IT Staff the problem appears resolved. It does not formally resolve or close the Ticket.</p>{error && <p role="alert" className="lab2-error-text">{error}</p>}<div className="lab2-attachment-actions"><button type="button" className="lab2-button lab2-button-primary" disabled={saving} onClick={() => void submit()}>{saving ? "Sending..." : "Confirm Problem Appears Resolved"}</button><button type="button" className="lab2-button lab2-button-secondary" disabled={saving} onClick={() => setConfirming(false)}>Cancel</button></div></div>}
  </section>;
}
