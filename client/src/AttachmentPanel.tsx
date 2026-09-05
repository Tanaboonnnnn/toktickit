import { useState } from "react";
import { downloadAttachment, fetchTicketAttachments, removeAttachment, SafeApiError, uploadAttachment, type Ticket, type TicketAttachmentMetadata } from "./api.js";
import { ATTACHMENT_ACCEPT, MAX_ACTIVE_ATTACHMENTS, formatAttachmentSize, validateLocalAttachment } from "./attachment-validation.js";
import { useRequesterContext } from "./requester-context.js";
import { formatDisplayDate } from "./date-format.js";

function formatDate(value: string): string { return formatDisplayDate(value); }

export default function AttachmentPanel({ ticket, onRefresh }: { ticket: Ticket; onRefresh: () => void }) {
  const { currentRequester } = useRequesterContext();
  const [selected, setSelected] = useState<File | null>(null);
  const [selectionError, setSelectionError] = useState("");
  const [busy, setBusy] = useState(false);
  type UploadStatus = "selected" | "uploading" | "uploaded" | "failed-definitive" | "ambiguous-awaiting-reconciliation" | "reconciling" | "reconciliation-failed" | "reconciled-retry-allowed";
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("selected");
  const [actionError, setActionError] = useState("");
  const [removeId, setRemoveId] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const activeCount = ticket.attachments.filter((item) => item.state === "ACTIVE").length;

  function choose(file: File | undefined) {
    if (!file) return;
    const error = validateLocalAttachment(file);
    setSelectionError(error ?? ""); setUploadStatus("selected");
    setSelected(error ? null : file);
  }
  async function upload() {
    if (!selected || !currentRequester) return;
    setBusy(true); setActionError(""); setUploadStatus("uploading");
    try { await uploadAttachment(currentRequester.id, ticket.id, selected); setUploadStatus("uploaded"); setSelected(null); onRefresh(); }
    catch (error) {
      if (error instanceof SafeApiError) { setUploadStatus("failed-definitive"); setActionError(error.message); }
      else { setUploadStatus("ambiguous-awaiting-reconciliation"); await reconcileUpload(); }
    }
    finally { setBusy(false); }
  }
  async function reconcileUpload() {
    if (!currentRequester) return;
    setUploadStatus("reconciling");
    try { await fetchTicketAttachments(currentRequester.id, ticket.id); setUploadStatus("reconciled-retry-allowed"); onRefresh(); }
    catch { setUploadStatus("reconciliation-failed"); setActionError("Unable to check upload status."); }
  }
  function retryUpload() { if (uploadStatus === "failed-definitive" || uploadStatus === "reconciled-retry-allowed") void upload(); }
  function retryStatusCheck() { if (uploadStatus === "reconciliation-failed") void reconcileUpload(); }
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
      {selected && <div className="lab2-selected-file"><span className="lab2-filename">{selected.name}</span><span>{formatAttachmentSize(selected.size)} ยท {selected.type}</span><span>{uploadStatus === "uploading" ? "Uploading..." : uploadStatus === "ambiguous-awaiting-reconciliation" ? "Upload result uncertain; checking status..." : uploadStatus === "reconciling" ? "Checking upload status..." : uploadStatus === "reconciliation-failed" ? "Unable to check upload status." : uploadStatus === "reconciled-retry-allowed" ? "Upload result uncertain; status checked." : uploadStatus === "failed-definitive" ? "Upload failed" : uploadStatus === "uploaded" ? "Uploaded" : "Selected"}</span><button type="button" className="lab2-button lab2-button-secondary" disabled={busy} onClick={() => setSelected(null)}>Remove selection</button>{(uploadStatus === "selected" || uploadStatus === "failed-definitive" || uploadStatus === "reconciled-retry-allowed") && <button type="button" className="lab2-button lab2-button-primary" disabled={busy} onClick={() => void (uploadStatus === "selected" ? upload() : retryUpload())}>{busy ? "Uploading..." : uploadStatus === "selected" ? "Upload attachment" : "Retry upload"}</button>}{uploadStatus === "reconciliation-failed" && <button type="button" className="lab2-button lab2-button-secondary" disabled={busy} onClick={retryStatusCheck}>Retry status check</button>}</div>}
    </div>
    {ticket.attachments.length === 0 ? <p className="lab2-muted">No Attachments.</p> : <div className="lab2-attachment-list">
      {ticket.attachments.map((attachment) => <AttachmentCard key={attachment.id} attachment={attachment} removing={removeId === attachment.id} busy={busy} onDownload={() => void download(attachment)} onRemove={() => { setRemoveId(attachment.id); setReason(""); setReasonError(""); }} onCancel={() => setRemoveId(null)} reason={reason} setReason={setReason} reasonError={reasonError} confirmRemove={() => void remove()} />)}
    </div>}
  </section>;
}

function AttachmentCard({ attachment, removing, busy, onDownload, onRemove, onCancel, reason, setReason, reasonError, confirmRemove }: { attachment: TicketAttachmentMetadata; removing: boolean; busy: boolean; onDownload: () => void; onRemove: () => void; onCancel: () => void; reason: string; setReason: (v: string) => void; reasonError: string; confirmRemove: () => void }) {
  return <article className="lab2-attachment-card"><h3 className="lab2-filename">{attachment.originalName}</h3><dl><dt>Type</dt><dd>{attachment.mimeType}</dd><dt>Size</dt><dd>{formatAttachmentSize(attachment.sizeBytes)}</dd><dt>Uploaded</dt><dd>{formatDate(attachment.createdAt)}</dd><dt>State</dt><dd>{attachment.state === "REMOVED" ? "Removed" : "Active"}</dd>{attachment.state === "REMOVED" && <><dt>Removed</dt><dd>{attachment.removedAt ? formatDate(attachment.removedAt) : "โ€”"}</dd><dt>Removal reason</dt><dd>{attachment.removalReason}</dd></>}
    </dl>{attachment.state === "ACTIVE" && !removing && <div className="lab2-attachment-actions"><button type="button" className="lab2-button lab2-button-secondary" onClick={onDownload}>Download {attachment.originalName}</button><button type="button" className="lab2-button lab2-button-tertiary lab2-button-remove" onClick={onRemove}>Remove attachment</button></div>}{removing && attachment.state === "ACTIVE" && <div className="lab2-remove-confirm"><label htmlFor={`removal-reason-${attachment.id}`}>Removal Reason <span aria-hidden="true">*</span></label><textarea id={`removal-reason-${attachment.id}`} required value={reason} aria-invalid={Boolean(reasonError)} aria-describedby={reasonError ? `removal-reason-error-${attachment.id}` : undefined} onChange={(event) => setReason(event.target.value)} /><p>Removed metadata stays visible and downloading will no longer be available.</p>{reasonError && <p id={`removal-reason-error-${attachment.id}`} role="alert">{reasonError}</p>}<button type="button" className="lab2-button lab2-button-secondary" disabled={busy} onClick={onCancel}>Cancel</button><button type="button" className="lab2-button lab2-button-destructive" disabled={busy} onClick={confirmRemove}>{busy ? "Removing attachment..." : "Remove attachment"}</button></div>}</article>;
}
