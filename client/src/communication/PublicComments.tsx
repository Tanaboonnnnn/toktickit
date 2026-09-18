import { useCallback, useEffect, useState } from "react";
import { SafeApiError } from "../api.js";
import { fetchPublicComments, postPublicComment, type TicketMessage } from "../api/communication.js";
import { formatDisplayDate } from "../date-format.js";

type LoadState = { kind: "loading" } | { kind: "ready"; items: TicketMessage[] } | { kind: "failure" };

export default function PublicComments({ ticketId }: { ticketId: number }) {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try { setState({ kind: "ready", items: await fetchPublicComments(ticketId) }); }
    catch { setState({ kind: "failure" }); }
  }, [ticketId]);

  useEffect(() => { setDraft(""); setError(""); void load(); }, [load]);

  async function submit() {
    const body = draft.trim();
    const length = Array.from(body).length;
    if (length < 1 || length > 2000) { setError("Public Comment must contain 1 to 2000 characters after trimming."); return; }
    setSaving(true); setError("");
    try {
      await postPublicComment(ticketId, body);
      setDraft("");
      setState({ kind: "ready", items: await fetchPublicComments(ticketId) });
    } catch (e) {
      setError(e instanceof SafeApiError && e.status === 400 ? e.message : "Unable to add Public Comment. Your draft was kept so you can retry.");
    } finally { setSaving(false); }
  }

  return <section className="lab3-communication-section lab3-public-comments" aria-labelledby={`public-comments-${ticketId}`}>
    <h2 id={`public-comments-${ticketId}`}>Public Comments</h2>
    <p className="lab2-muted">Visible to you and authorized service-desk staff on this Ticket.</p>
    {state.kind === "loading" && <p role="status">Loading Public Comments...</p>}
    {state.kind === "failure" && <div className="lab2-error" role="alert"><p>Unable to load Public Comments.</p><button type="button" className="lab2-button lab2-button-secondary" onClick={() => void load()}>Retry Public Comments</button></div>}
    {state.kind === "ready" && (state.items.length === 0
      ? <p className="lab2-muted">No Public Comments yet.</p>
      : <div className="lab3-message-list">{state.items.map((item) => <article key={item.id} className="lab3-message-card"><div className="lab3-message-meta"><strong>{item.author.name}</strong><span>{item.author.role === "REQUESTER" ? "Requester" : item.author.role === "IT_STAFF" ? "IT Staff" : "Administrator"}</span><time dateTime={item.createdAt}>{formatDisplayDate(item.createdAt)}</time></div><p>{item.body}</p></article>)}</div>)}
    <div className="lab3-message-composer">
      <label htmlFor={`public-comment-${ticketId}`}>Public Comment</label>
      <textarea id={`public-comment-${ticketId}`} value={draft} maxLength={2000} disabled={saving} onChange={(event) => setDraft(event.target.value)} />
      <p className="lab2-muted">1–2000 characters. This message is visible to the Requester and authorized staff.</p>
      {error && <p className="lab2-error-text" role="alert">{error}</p>}
      <button type="button" className="lab2-button lab2-button-primary" disabled={saving} onClick={() => void submit()}>{saving ? "Posting..." : "Post Public Comment"}</button>
    </div>
  </section>;
}
