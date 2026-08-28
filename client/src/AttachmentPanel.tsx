import { useState } from "react";
import { downloadAttachment, removeAttachment, SafeApiError, uploadAttachment, type Ticket, type TicketAttachmentMetadata } from "./api.js";
import { ATTACHMENT_ACCEPT, MAX_ACTIVE_ATTACHMENTS, formatAttachmentSize, validateLocalAttachment } from "./attachment-validation.js";
import { useRequesterContext } from "./requester-context.js";

function formatDate(value: string): string { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleString(); }

export default function AttachmentPanel({ ticket, onRefresh }: { ticket: Ticket; onRefresh: () => void }) {
  const { currentRequester } = useRequesterContext();
  const [selected, setSelected] = useState<File | null>(null);
  const [selectionError, setSelectionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [removeId, setRemoveId] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const activeCount = ticket.attachments.filter((item) => item.state === "ACTIVE").length;

  function choose(file: File | undefined) {
    if (!file) return;
    const error = validateLocalAttachment(file);
    setSelectionError(error ?? "");
    setSelected(error ? null : file);
  }
  async function upload() {
    if (!selected || !currentRequester) return;
    setBusy(true); setActionError("");
    try { await uploadAttachment(currentRequester.id, ticket.id, selected); setSelected(null); onRefresh(); }
    catch (error) { setActionError(error instanceof SafeApiError ? error.message : "Unable to upload attachment"); }
    finally { setBusy(false); }
  }
  async function download(attachment: TicketAttachmentMetadata) {
    if (!currentRequester) return;
    setActionError("");
    try { await downloadAttachment(currentRequester.id, ticket.id, attachment.id, attachment.originalName); }
    catch (error) { setActionError(error instanceof SafeApiError ? "Unable to download attachment" : "Unable to download attachment"); }
  }
  async function remove() {
    if (!currentRequester || removeId === null) return;
    const trimmed = reason.trim();
    if (trimmed.length < 3 || trimmed.length > 200) { setReasonError("Removal reason must contain 3 to 200 characters."); return; }
    setBusy(true); setActionError("");
    try { await removeAttachment(currentRequester.id, ticket.id, removeId, trimmed); setRemoveId(null); setReason(""); setReasonError(""); onRefresh(); }
    catch (error) { setActionError(error instanceof SafeApiError ? error.message : "Unable to remove attachment"); }
    finally { setBusy(false); }
  }
  return <section className="lab2-attachments-section" aria-labelledby="attachments-heading">
    <h2 id="attachments-heading">Attachments</h2>
    {activeCount >= MAX_ACTIVE_ATTACHMENTS && <p className="lab2-warning" role="status">Maximum five active Attachments reached. Remove one before uploading another.</p>}
    {selectionError && <p className="lab2-error-text" role="alert">{selectionError}</p>}
    {actionError && <p className="lab2-error-text" role="alert">{actionError}</p>}
    <div className="lab2-attachment-upload-controls">
      <label htmlFor="detail-attachment-file">Add an Attachment</label>
      <input id="detail-attachment-file" type="file" accept={ATTACHMENT_ACCEPT} disabled={busy || activeCount >= MAX_ACTIVE_ATTACHMENTS} onChange={(event) => { choose(event.target.files?.[0]); event.target.value = ""; }} />
      {selected && <div className="lab2-selected-file"><span className="lab2-filename">{selected.name}</span><span>{formatAttachmentSize(selected.size)} · {selected.type}</span><span>Selected</span><button type="button" disabled={busy} onClick={() => setSelected(null)}>Remove selection</button><button type="button" className="lab2-button lab2-button-primary" disabled={busy} onClick={() => void upload()}>{busy ? "Uploading..." : "Upload attachment"}</button></div>}
    </div>
    {ticket.attachments.length === 0 ? <p className="lab2-muted">No Attachments.</p> : <div className="lab2-attachment-list">
      {ticket.attachments.map((attachment) => <AttachmentCard key={attachment.id} attachment={attachment} removing={removeId === attachment.id} busy={busy} onDownload={() => void download(attachment)} onRemove={() => { setRemoveId(attachment.id); setReason(""); setReasonError(""); }} onCancel={() => setRemoveId(null)} reason={reason} setReason={setReason} reasonError={reasonError} confirmRemove={() => void remove()} />)}
    </div>}
  </section>;
}

function AttachmentCard({ attachment, removing, busy, onDownload, onRemove, onCancel, reason, setReason, reasonError, confirmRemove }: { attachment: TicketAttachmentMetadata; removing: boolean; busy: boolean; onDownload: () => void; onRemove: () => void; onCancel: () => void; reason: string; setReason: (v: string) => void; reasonError: string; confirmRemove: () => void }) {
  return <article className="lab2-attachment-card"><h3 className="lab2-filename">{attachment.originalName}</h3><dl><dt>Type</dt><dd>{attachment.mimeType}</dd><dt>Size</dt><dd>{formatAttachmentSize(attachment.sizeBytes)}</dd><dt>Uploaded</dt><dd>{formatDate(attachment.createdAt)}</dd><dt>State</dt><dd>{attachment.state === "REMOVED" ? "Removed" : "Active"}</dd>{attachment.state === "REMOVED" && <><dt>Removed</dt><dd>{attachment.removedAt ? formatDate(attachment.removedAt) : "—"}</dd><dt>Removal reason</dt><dd>{attachment.removalReason}</dd></>}
    </dl>{attachment.state === "ACTIVE" && !removing && <div className="lab2-attachment-actions"><button type="button" onClick={onDownload}>Download {attachment.originalName}</button><button type="button" onClick={onRemove}>Remove attachment</button></div>}{removing && attachment.state === "ACTIVE" && <div className="lab2-remove-confirm"><label htmlFor={`removal-reason-${attachment.id}`}>Removal Reason <span aria-hidden="true">*</span></label><textarea id={`removal-reason-${attachment.id}`} required value={reason} aria-invalid={Boolean(reasonError)} aria-describedby={reasonError ? `removal-reason-error-${attachment.id}` : undefined} onChange={(event) => setReason(event.target.value)} /><p>Removed metadata stays visible and downloading will no longer be available.</p>{reasonError && <p id={`removal-reason-error-${attachment.id}`} role="alert">{reasonError}</p>}<button type="button" disabled={busy} onClick={onCancel}>Cancel</button><button type="button" disabled={busy} onClick={confirmRemove}>{busy ? "Removing attachment..." : "Remove attachment"}</button></div>}</article>;
}
