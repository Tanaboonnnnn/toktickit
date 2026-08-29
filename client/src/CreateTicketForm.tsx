import { useCallback, useEffect, useRef, useState } from "react";
import {
  createTicket,
  fetchTicketAttachments,
  fetchCategories,
  fetchRelatedSystems,
  SafeApiError,
  uploadAttachment,
  type Category,
  type RelatedSystem,
  type RequestedPriority,
  type Ticket,
} from "./api.js";
import { useRequesterContext } from "./requester-context.js";
import { ATTACHMENT_ACCEPT, MAX_ATTACHMENT_BYTES, MAX_ACTIVE_ATTACHMENTS, formatAttachmentSize, validateLocalAttachment } from "./attachment-validation.js";

type ReferenceState = "loading" | "ready" | "error" | "empty";

type SubmissionState =
  | { kind: "idle" }
  | { kind: "busy" }
  | { kind: "success"; ticket: Ticket; replayed: boolean }
  | { kind: "failure"; message: string; ambiguous: boolean };

interface BoundSubmission {
  clientRequestId: string;
  payload: {
    categoryId: number;
    relatedSystemId: number;
    summary: string;
    requestedPriority: RequestedPriority;
    description: string;
  };
}

function generateUuid(): string {
  return crypto.randomUUID();
}

const PRIORITIES: RequestedPriority[] = ["LOW", "MEDIUM", "HIGH"];
const FIELD_ORDER = ["categoryId", "relatedSystemId", "summary", "requestedPriority", "description"] as const;
type FieldName = typeof FIELD_ORDER[number];

const MAX_SELECTED_FILES = MAX_ACTIVE_ATTACHMENTS;

interface SelectedAttachment {
  id: number;
  file: File;
  error: string | null;
}
type AttachmentUploadStatus =
  | "selected" | "uploading" | "uploaded" | "failed-definitive"
  | "ambiguous-awaiting-reconciliation" | "reconciling"
  | "reconciliation-failed" | "reconciled-retry-allowed";

const validateAttachmentFile = validateLocalAttachment;
const formatFileSize = formatAttachmentSize;

interface CreateTicketFormProps {
  onViewTicket?: (ticketId: number) => void;
  onMyTickets?: () => void;
}

export default function CreateTicketForm({ onViewTicket, onMyTickets }: CreateTicketFormProps) {
  const { currentRequester } = useRequesterContext();

  const [categoryState, setCategoryState] = useState<ReferenceState>("loading");
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryError, setCategoryError] = useState("");
  const [systemState, setSystemState] = useState<ReferenceState>("loading");
  const [relatedSystems, setRelatedSystems] = useState<RelatedSystem[]>([]);
  const [systemError, setSystemError] = useState("");

  const [categoryId, setCategoryId] = useState("");
  const [relatedSystemId, setRelatedSystemId] = useState("");
  const [summary, setSummary] = useState("");
  const [priority, setPriority] = useState("");
  const [description, setDescription] = useState("");

  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [submission, setSubmission] = useState<SubmissionState>({ kind: "idle" });
  const boundRef = useRef<BoundSubmission | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<SelectedAttachment[]>([]);
  const [uploadStates, setUploadStates] = useState<Record<number, AttachmentUploadStatus>>({});
  const nextFileId = useRef(1);

  const refs = {
    categoryId: useRef<HTMLSelectElement>(null),
    relatedSystemId: useRef<HTMLSelectElement>(null),
    summary: useRef<HTMLInputElement>(null),
    requestedPriority: useRef<HTMLSelectElement>(null),
    description: useRef<HTMLTextAreaElement>(null),
  };

  const loadCategories = useCallback(async () => {
    setCategoryState("loading");
    try {
      const loaded = await fetchCategories();
      setCategories(loaded);
      setCategoryState(loaded.length > 0 ? "ready" : "empty");
    } catch {
      setCategoryState("error");
      setCategoryError("Unable to load Categories. Please try again.");
    }
  }, []);

  const loadRelatedSystems = useCallback(async () => {
    setSystemState("loading");
    try {
      const loaded = await fetchRelatedSystems();
      setRelatedSystems(loaded);
      setSystemState(loaded.length > 0 ? "ready" : "empty");
    } catch {
      setSystemState("error");
      setSystemError("Unable to load Related Systems. Please try again.");
    }
  }, []);

  useEffect(() => {
    void loadCategories();
    void loadRelatedSystems();
  }, [loadCategories, loadRelatedSystems]);

  function validate(): Partial<Record<FieldName, string>> {
    const errors: Partial<Record<FieldName, string>> = {};
    if (!/^[1-9]\d*$/.test(categoryId)) errors.categoryId = "Category is required.";
    if (!/^[1-9]\d*$/.test(relatedSystemId)) errors.relatedSystemId = "Related System is required.";
    const trimmedSummary = summary.trim();
    if (trimmedSummary.length < 5) errors.summary = trimmedSummary.length === 0
        ? "Summary is required."
        : `Summary must contain at least 5 characters after trimming (currently ${trimmedSummary.length}).`;
    else if (trimmedSummary.length > 120) errors.summary = "Summary must contain at most 120 characters after trimming.";
    if (!PRIORITIES.includes(priority as RequestedPriority))
      errors.requestedPriority = "Please select a Requested Priority.";
    const trimmedDescription = description.trim();
    if (trimmedDescription.length < 10) errors.description = trimmedDescription.length === 0
        ? "Description is required."
        : `Description must contain at least 10 characters after trimming (currently ${trimmedDescription.length}).`;
    else if (trimmedDescription.length > 2000) errors.description = "Description must contain at most 2000 characters after trimming.";
    return errors;
  }

  async function submitCreate() {
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      for (const field of FIELD_ORDER) {
        if (errors[field] && refs[field].current) {
          refs[field].current?.focus();
          break;
        }
      }
      return;
    }

    if (!boundRef.current) {
      boundRef.current = {
        clientRequestId: generateUuid(),
        payload: {
          categoryId: Number(categoryId),
          relatedSystemId: Number(relatedSystemId),
          summary: summary.trim(),
          requestedPriority: priority as RequestedPriority,
          description: description.trim(),
        },
      };
    }
    const bound = boundRef.current;
    setSubmission({ kind: "busy" });

    try {
      const result = await createTicket(
        currentRequester?.id ?? 0,
        { clientRequestId: bound.clientRequestId, ...bound.payload },
      );
      boundRef.current = null;
      setSubmission({ kind: "success", ticket: result.ticket, replayed: result.replayed });
      void uploadSelectedAttachments(result.ticket.id);
    } catch (error) {
      if (error instanceof SafeApiError) {
        if (error.status >= 400 && error.status < 500) {
          boundRef.current = null;
        }
        const message = error.message || "Unable to create the Ticket.";
        if (error.fieldErrors && Object.keys(error.fieldErrors).length > 0) {
          setFieldErrors(prev => ({ ...prev, ...error.fieldErrors }));
        }
        setSubmission({ kind: "failure", message, ambiguous: false });
      } else {
        setSubmission({
          kind: "failure",
          ambiguous: true,
          message: "The result is uncertain because the response was lost or the network failed. Retry will send the same submission with the same identifier.",
        });
      }
    }
  }

  function retrySubmit() {
    if (submission.kind !== "failure") return;
    void submitCreate();
  }

  function startAnotherTicket() {
    boundRef.current = null;
    setCategoryId("");
    setRelatedSystemId("");
    setSummary("");
    setPriority("");
    setDescription("");
    setFieldErrors({});
    setSelectedFiles([]);
    setUploadStates({});
    nextFileId.current = 1;
    setSubmission({ kind: "idle" });
  }

  function updateField(field: FieldName, value: string) {
    if (submission.kind === "failure" && !submission.ambiguous && boundRef.current !== null) {
      boundRef.current = null;
    }
    switch (field) {
      case "categoryId": setCategoryId(value); break;
      case "relatedSystemId": setRelatedSystemId(value); break;
      case "summary": setSummary(value); break;
      case "requestedPriority": setPriority(value); break;
      case "description": setDescription(value); break;
    }
  }

  function handleFileSelection(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const incoming = Array.from(fileList).map((file) => ({
      id: nextFileId.current++,
      file,
      error: validateAttachmentFile(file),
    }));
    let validSlotsRemaining = MAX_SELECTED_FILES - selectedFiles.filter((entry) => !entry.error).length;
    const processed = incoming.map((entry) => {
      if (entry.error === null && validSlotsRemaining <= 0) {
        return { ...entry, error: "Maximum five files may be selected." };
      }
      if (entry.error === null) validSlotsRemaining -= 1;
      return entry;
    });
    setSelectedFiles((previous) => [...previous, ...processed]);
    setUploadStates((previous) => ({ ...previous, ...Object.fromEntries(processed.map((entry) => [entry.id, "selected" as const])) }));
  }

  function removeSelectedFile(id: number) {
    setSelectedFiles((previous) => previous.filter((entry) => entry.id !== id));
  }

  async function reconcileAttachment(entry: SelectedAttachment, ticketId: number) {
    setUploadStates((previous) => ({ ...previous, [entry.id]: "reconciling" }));
    try {
      await fetchTicketAttachments(currentRequester?.id ?? 0, ticketId);
      setUploadStates((previous) => ({ ...previous, [entry.id]: "reconciled-retry-allowed" }));
    } catch {
      setUploadStates((previous) => ({ ...previous, [entry.id]: "reconciliation-failed" }));
    }
  }

  async function uploadOneAttachment(entry: SelectedAttachment, ticketId: number) {
    if (entry.error) return;
    setUploadStates((previous) => ({ ...previous, [entry.id]: "uploading" }));
    try {
      await uploadAttachment(currentRequester?.id ?? 0, ticketId, entry.file);
      setUploadStates((previous) => ({ ...previous, [entry.id]: "uploaded" }));
    } catch (error) {
      if (!(error instanceof SafeApiError)) {
        setUploadStates((previous) => ({ ...previous, [entry.id]: "ambiguous-awaiting-reconciliation" }));
        await reconcileAttachment(entry, ticketId);
      } else {
        setUploadStates((previous) => ({ ...previous, [entry.id]: "failed-definitive" }));
      }
    }
  }

  async function uploadSelectedAttachments(ticketId: number) {
    const eligible = selectedFiles.filter((entry) => !entry.error);
    await Promise.all(eligible.map((entry) => uploadOneAttachment(entry, ticketId)));
  }

  function retryAttachment(entry: SelectedAttachment, ticketId: number) {
    const status = uploadStates[entry.id];
    if (status === "failed-definitive" || status === "reconciled-retry-allowed") void uploadOneAttachment(entry, ticketId);
  }

  function retryAttachmentStatus(entry: SelectedAttachment, ticketId: number) {
    const status = uploadStates[entry.id];
    if (status === "reconciliation-failed" || status === "ambiguous-awaiting-reconciliation") void reconcileAttachment(entry, ticketId);
  }

  const isBusy = submission.kind === "busy";
  const ambiguousFrozen = submission.kind === "failure" && submission.ambiguous;
  const formLocked = isBusy || ambiguousFrozen;
  const referencesReady = categoryState === "ready" && systemState === "ready";
  const canSubmit = referencesReady && !formLocked;

  return (
    <section className="lab2-create-ticket" aria-labelledby="create-ticket-heading">
      <h1 id="create-ticket-heading">Create Ticket</h1>

      {submission.kind === "success" ? (
        <div className="lab2-success" role="status">
          <p>{submission.replayed
            ? "This Ticket already exists and has been shown again."
            : "Your Ticket has been created."}
          </p>
          <dl>
            <dt>Ticket Number</dt><dd data-testid="ticket-number">{submission.ticket.ticketNumber}</dd>
            <dt>Current Status</dt><dd>New</dd>
            <dt>Ticket Date</dt><dd>{new Date(submission.ticket.createdAt).toLocaleString()}</dd>
            <dt>Requester</dt><dd>{submission.ticket.requester.name}</dd>
            <dt>Category</dt><dd>{submission.ticket.category.name}</dd>
            <dt>Related System</dt><dd>{submission.ticket.relatedSystem.name}</dd>
            <dt>Summary</dt><dd>{submission.ticket.summary}</dd>
            <dt>Requested Priority</dt><dd>{submission.ticket.requestedPriority}</dd>
            <dt>Description</dt><dd>{submission.ticket.description}</dd>
          </dl>
          {selectedFiles.some((entry) => !entry.error) && (
            <div className="lab2-attachment-upload-results" aria-live="polite">
              <h2>Attachment uploads</h2>
              <ul className="lab2-selected-files">
                {selectedFiles.filter((entry) => !entry.error).map((entry) => {
                  const status = uploadStates[entry.id] ?? "selected";
                  const statusText = status === "uploading" ? "Uploading..." : status === "uploaded" ? "Uploaded" : status === "failed-definitive" ? "Upload failed" : status === "ambiguous-awaiting-reconciliation" ? "Upload result uncertain; checking status..." : status === "reconciling" ? "Checking upload status..." : status === "reconciliation-failed" ? "Unable to check upload status." : status === "reconciled-retry-allowed" ? "Upload result uncertain; status checked." : "Selected";
                  return <li key={entry.id}><span>{entry.file.name}</span><span>{statusText}</span>{(status === "failed-definitive" || status === "reconciled-retry-allowed") && <button type="button" className="lab2-button lab2-button-secondary" onClick={() => retryAttachment(entry, submission.ticket.id)}>Retry upload</button>}{status === "reconciliation-failed" && <button type="button" className="lab2-button lab2-button-secondary" onClick={() => retryAttachmentStatus(entry, submission.ticket.id)}>Retry status check</button>}</li>;
                })}
              </ul>
            </div>
          )}
          <div className="lab2-success-actions">
            <button type="button" className="lab2-button lab2-button-primary" onClick={startAnotherTicket}>
              Create another Ticket
            </button>
            <button type="button" className="lab2-button lab2-button-secondary" onClick={() => onViewTicket?.(submission.ticket.id)}>
              View Ticket
            </button>
            <button type="button" className="lab2-button lab2-button-secondary" onClick={() => onMyTickets?.()}>
              My Tickets
            </button>
          </div>
        </div>
      ) : (
        <>
          {submission.kind === "failure" && (
            <div className={submission.ambiguous ? "lab2-warning" : "lab2-error"} role="alert">
              <p>{submission.message}</p>
              <button type="button" onClick={retrySubmit}>
                {submission.ambiguous ? "Retry same submission" : "Retry"}
              </button>
            </div>
          )}

          <form onSubmit={(event) => { event.preventDefault(); void submitCreate(); }}>
            <fieldset disabled={formLocked} aria-label="Ticket identity">
              <legend>Ticket identity and context</legend>
              <div><label htmlFor="ticket-number">Ticket Number</label><output id="ticket-number">Generated after creation</output></div>
              <div><label htmlFor="ticket-date">Ticket Date</label><output id="ticket-date">Set after creation</output></div>
              <div><label htmlFor="requester-display">Requester</label><output id="requester-display">{currentRequester?.name ?? ""}</output></div>
            </fieldset>

            <fieldset disabled={formLocked} aria-label="Ticket details">
              <legend>Ticket details</legend>
              <div className="lab2-field-group">
                <label htmlFor="ticket-category">Category *</label>
                <select ref={refs.categoryId} id="ticket-category" value={categoryId}
                  disabled={!referencesReady} aria-required="true"
                  aria-invalid={Boolean(fieldErrors.categoryId)}
                  aria-describedby={fieldErrors.categoryId ? "ticket-category-error" : undefined}
                  onChange={(event) => updateField("categoryId", event.target.value)}
                >
                  <option value="">Select a Category</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {fieldErrors.categoryId && <p id="ticket-category-error" role="alert">{fieldErrors.categoryId}</p>}
                {categoryState === "loading" && <p role="status">Loading Categories...</p>}
                {categoryState === "empty" && <p role="alert">No active Categories available. Ticket creation is currently unavailable.</p>}
                {categoryState === "error" && (
                  <div role="alert"><p>{categoryError}</p>
                    <button type="button" onClick={() => { void loadCategories(); }}>Retry Categories</button></div>
                )}
              </div>
              <div className="lab2-field-group">
                <label htmlFor="ticket-related-system">Related System *</label>
                <select ref={refs.relatedSystemId} id="ticket-related-system" value={relatedSystemId}
                  disabled={!referencesReady} aria-required="true"
                  aria-invalid={Boolean(fieldErrors.relatedSystemId)}
                  aria-describedby={fieldErrors.relatedSystemId ? "ticket-related-system-error" : undefined}
                  onChange={(event) => updateField("relatedSystemId", event.target.value)}
                >
                  <option value="">Select a Related System</option>
                  {relatedSystems.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {fieldErrors.relatedSystemId && <p id="ticket-related-system-error" role="alert">{fieldErrors.relatedSystemId}</p>}
                {systemState === "loading" && <p role="status">Loading Related Systems...</p>}
                {systemState === "empty" && <p role="alert">No active Related Systems available. Ticket creation is currently unavailable.</p>}
                {systemState === "error" && (
                  <div role="alert"><p>{systemError}</p>
                    <button type="button" onClick={() => { void loadRelatedSystems(); }}>Retry Related Systems</button></div>
                )}
              </div>
              <div className="lab2-field-group">
                <label htmlFor="ticket-summary">Ticket Summary *</label>
                <input ref={refs.summary} id="ticket-summary" type="text" value={summary}
                  maxLength={120} aria-required="true"
                  aria-invalid={Boolean(fieldErrors.summary)}
                  aria-describedby={fieldErrors.summary ? "ticket-summary-error" : undefined}
                  onChange={(event) => updateField("summary", event.target.value)}
                />
                {fieldErrors.summary && <p id="ticket-summary-error" role="alert">{fieldErrors.summary}</p>}
              </div>
              <div className="lab2-field-group">
                <label htmlFor="ticket-priority">Requested Priority *</label>
                <select ref={refs.requestedPriority} id="ticket-priority" value={priority}
                  aria-required="true"
                  aria-invalid={Boolean(fieldErrors.requestedPriority)}
                  aria-describedby={fieldErrors.requestedPriority ? "ticket-priority-error" : undefined}
                  onChange={(event) => updateField("requestedPriority", event.target.value)}
                >
                  <option value="">Select Priority</option>
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0)}{p.slice(1).toLowerCase()}</option>)}
                </select>
                {fieldErrors.requestedPriority && <p id="ticket-priority-error" role="alert">{fieldErrors.requestedPriority}</p>}
              </div>
              <div className="lab2-field-group">
                <label htmlFor="ticket-description">Description *</label>
                <textarea ref={refs.description} id="ticket-description" rows={5} value={description}
                  maxLength={2000} aria-required="true"
                  aria-invalid={Boolean(fieldErrors.description)}
                  aria-describedby={fieldErrors.description ? "ticket-description-error" : undefined}
                  onChange={(event) => updateField("description", event.target.value)}
                />
                {fieldErrors.description && <p id="ticket-description-error" role="alert">{fieldErrors.description}</p>}
              </div>
            </fieldset>

            <fieldset disabled={formLocked} aria-label="Attachments">
              <legend>Attachments</legend>
              <p className="lab2-muted">
                Allowed types: JPG/JPEG, PNG, WEBP, PDF. Maximum 5 MB (5,242,880 bytes) per file. Maximum five selected files.
              </p>
              <div className="lab2-field-group">
                <label htmlFor="ticket-attachments">Select files</label>
                <input
                  id="ticket-attachments"
                  type="file"
                  multiple
                  accept={ATTACHMENT_ACCEPT}
                  onChange={(event) => {
                    handleFileSelection(event.target.files);
                    event.target.value = "";
                  }}
                />
                {selectedFiles.length > 0 && (
                  <ul className="lab2-selected-files">
                    {selectedFiles.map(({ id, file, error }) => (
                      <li key={id}>
                        {error ? (
                          <>
                            <span>{file.name}</span>
                            <span role="alert">{error}</span>
                          </>
                        ) : (
                          <>
                            <span>{file.name}</span>
                            <span>Selected</span>
                          </>
                        )}
                        <span>{formatFileSize(file.size)} · {file.type}</span>
                        <button type="button" onClick={() => removeSelectedFile(id)}>
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </fieldset>
            <button type="submit" className="lab2-button lab2-button-primary" disabled={!canSubmit}>
              {isBusy ? "Creating ticket..." : "Create Ticket"}
            </button>
          </form>
        </>
      )}
    </section>
  );
}
