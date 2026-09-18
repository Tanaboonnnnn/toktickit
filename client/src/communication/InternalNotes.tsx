import { useCallback, useEffect, useState } from "react";
import { SafeApiError } from "../api.js";
import { fetchInternalNotes, postInternalNote, type TicketMessage } from "../api/communication.js";
import { formatDisplayDate } from "../date-format.js";

type LoadState = { kind: "loading" } | { kind: "ready"; items: TicketMessage[] } | { kind: "failure" };

export default function InternalNotes({ ticketId }: { ticketId: number }) {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try { setState({ kind: "ready", items: await fetchInternalNotes(ticketId) }); }
    catch { setState({ kind: "failure" }); }
  }, [ticketId]);
  useEffect(() => { setDraft(""); setError(""); void load(); }, [load]);

  async function submit() {
    const body = draft.trim();
    const length = Array.from(body).length;
    if (length < 1 || length > 2000) { setError("Internal Note must contain 1 to 2000 characters after trimming."); return; }
    setSaving(true); setError("");
    try {
      await postInternalNote(ticketId, body);
      setDraft("");
      setState({ kind: "ready", items: await fetchInternalNotes(ticketId) });
    } catch (e) {
      setError(e instanceof SafeApiError && e.status === 400 ? e.message : "Unable to add Internal Note. Your draft was kept so you can retry.");
    } finally { setSaving(false); }
  }

  return <section className="lab3-communication-section lab3-internal-notes" aria-labelledby={`internal-notes-${ticketId}`}>
    <div className="lab3-private-heading"><h2 id={`internal-notes-${ticketId}`}>Internal Notes</h2><strong>Internal / Staff only</strong></div>
    <p className="lab3-private-warning">Never visible to the Requester. Use Public Comments for anything the Requester should read.</p>
    {state.kind === "loading" && <p role="status">Loading Internal Notes...</p>}
    {state.kind === "failure" && <div className="lab2-error" role="alert"><p>Unable to load Internal Notes.</p><button type="button" className="lab2-button lab2-button-secondary" onClick={() => void load()}>Retry Internal Notes</button></div>}
    {state.kind === "ready" && (state.items.length === 0
      ? <p className="lab2-muted">No Internal Notes yet.</p>
      : <div className="lab3-message-list">{state.items.map((item) => <article key={item.id} className="lab3-message-card lab3-private-message"><div className="lab3-message-meta"><strong>{item.author.name}</strong><span>{item.author.role === "IT_STAFF" ? "IT Staff" : "Administrator"}</span><time dateTime={item.createdAt}>{formatDisplayDate(item.createdAt)}</time></div><p>{item.body}</p></article>)}</div>)}
    <div className="lab3-message-composer">
      <label htmlFor={`internal-note-${ticketId}`}>Internal Note</label>
      <textarea id={`internal-note-${ticketId}`} value={draft} maxLength={2000} disabled={saving} onChange={(event) => setDraft(event.target.value)} />
      <p className="lab2-muted">1–2000 characters. Staff/Admin only.</p>
      {error && <p className="lab2-error-text" role="alert">{error}</p>}
      <button type="button" className="lab2-button lab2-button-secondary" disabled={saving} onClick={() => void submit()}>{saving ? "Saving..." : "Add Internal Note"}</button>
    </div>
  </section>;
}
