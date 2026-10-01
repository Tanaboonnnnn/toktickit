import { useEffect, useRef, useState } from "react";
import {
  createActionTaken,
  fetchActionRevisions,
  fetchActionsTaken,
  updateActionStatus,
  updateActionTaken,
  type ActionListResponse,
  type ActionStatus,
  type ActionTakenPublic,
  type CreateActionTakenInput,
} from "../api/actions.js";
import { SafeApiError } from "../api.js";
import { fetchStaffAssignees, type StaffUserSummary } from "../api/staff.js";
import { useAuth } from "../auth-context.js";
import { formatDisplayDate } from "../date-format.js";

type ActionsMode = "staff" | "requester";

interface ActionsTakenProps {
  mode: ActionsMode;
  ticketId: number;
  ticketNumber: string;
  ticketVersion?: number;
  onTicketChanged?: (ticketVersion: number) => void | Promise<void>;
  onConflict?: () => number | void | Promise<number | void>;
}

type LoadState =
  | { kind: "loading" }
  | { kind: "failure" }
  | { kind: "success"; response: ActionListResponse };

const statusLabels: Record<ActionStatus, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

function roleLabel(role: ActionTakenPublic["assignee"]["role"]): string {
  if (role === "ADMINISTRATOR") return "Administrator";
  if (role === "IT_STAFF") return "IT Staff";
  return "Requester";
}

export default function ActionsTaken(props: ActionsTakenProps) {
  const { mode, ticketId } = props;
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const requestGeneration = useRef(0);
  const [assignees, setAssignees] = useState<StaffUserSummary[]>([]);
  const [assigneeLoadError, setAssigneeLoadError] = useState("");
  const [assigneeReload, setAssigneeReload] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [description, setDescription] = useState("");
  const [result, setResult] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [followUpNote, setFollowUpNote] = useState("");
  const [attachmentNotes, setAttachmentNotes] = useState("");
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createFieldErrors, setCreateFieldErrors] = useState<Record<string, string>>({});
  const [createAmbiguous, setCreateAmbiguous] = useState(false);
  const [createFeedback, setCreateFeedback] = useState("");
  const [currentTicketVersion, setCurrentTicketVersion] = useState(props.ticketVersion ?? 0);
  const boundCreate = useRef<CreateActionTakenInput | null>(null);
  const createDescriptionRef = useRef<HTMLTextAreaElement>(null);
  const createAssigneeRef = useRef<HTMLSelectElement>(null);
  const createResultRef = useRef<HTMLTextAreaElement>(null);
  const createFollowUpRef = useRef<HTMLTextAreaElement>(null);
  const createAttachmentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setPage(1);
    setShowCreate(false);
    setDescription("");
    setResult("");
    setFollowUpRequired(false);
    setFollowUpNote("");
    setAttachmentNotes("");
    setCreateError("");
    setCreateFieldErrors({});
    setCreateAmbiguous(false);
    setCreateFeedback("");
    boundCreate.current = null;
  }, [ticketId]);

  useEffect(() => {
    if (props.ticketVersion !== undefined) setCurrentTicketVersion(props.ticketVersion);
  }, [props.ticketVersion]);

  useEffect(() => {
    if (mode !== "staff") return;
    let active = true;
    setAssigneeLoadError("");
    void fetchStaffAssignees()
      .then((items) => {
        if (!active) return;
        setAssignees(items);
      })
      .catch(() => {
        if (active) setAssigneeLoadError("Unable to load eligible Action assignees.");
      });
    return () => { active = false; };
  }, [mode, ticketId, assigneeReload]);

  useEffect(() => {
    const generation = ++requestGeneration.current;
    setState({ kind: "loading" });
    void fetchActionsTaken(ticketId, page, 20)
      .then((response) => {
        if (requestGeneration.current === generation) setState({ kind: "success", response });
      })
      .catch(() => {
        if (requestGeneration.current === generation) setState({ kind: "failure" });
      });
  }, [ticketId, page, reload]);

  const response = state.kind === "success" ? state.response : null;

  async function handleMutation(ticketVersion: number) {
    setCurrentTicketVersion(ticketVersion);
    setReload((value) => value + 1);
    await props.onTicketChanged?.(ticketVersion);
  }

  async function handleConflict() {
    setReload((value) => value + 1);
    const freshVersion = await props.onConflict?.();
    if (typeof freshVersion === "number") setCurrentTicketVersion(freshVersion);
  }

  function openCreate() {
    setCreateFeedback("");
    setCreateError("");
    setCreateFieldErrors({});
    setAssigneeId(user ? String(user.id) : "");
    setShowCreate(true);
  }

  function closeCreate() {
    if (createAmbiguous || createBusy) return;
    boundCreate.current = null;
    setShowCreate(false);
    setCreateError("");
    setCreateFieldErrors({});
  }

  function createPayload(): CreateActionTakenInput | null {
    const errors: Record<string, string> = {};
    const normalizedDescription = description.trim();
    const normalizedResult = result.trim();
    const normalizedFollowUpNote = followUpNote.trim();
    const normalizedAttachmentNotes = attachmentNotes.trim();
    const parsedAssignee = Number(assigneeId);
    if (Array.from(normalizedDescription).length < 1) errors.description = "Action Description is required.";
    else if (Array.from(normalizedDescription).length > 2000) errors.description = "Action Description must contain at most 2000 characters.";
    if (!Number.isSafeInteger(parsedAssignee) || parsedAssignee < 1) errors.assigneeId = "Assignee is required.";
    if (Array.from(normalizedResult).length > 2000) errors.result = "Result must contain at most 2000 characters.";
    if (followUpRequired && normalizedFollowUpNote.length === 0) errors.followUpNote = "Follow-up Note is required when follow-up is required.";
    else if (Array.from(normalizedFollowUpNote).length > 2000) errors.followUpNote = "Follow-up Note must contain at most 2000 characters.";
    if (Array.from(normalizedAttachmentNotes).length > 2000) errors.attachmentNotes = "Attachment Notes must contain at most 2000 characters.";
    setCreateFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      focusCreateError(errors);
      return null;
    }
    return {
      clientRequestId: crypto.randomUUID(),
      expectedTicketVersion: currentTicketVersion,
      description: normalizedDescription,
      result: normalizedResult || null,
      assigneeId: parsedAssignee,
      followUpRequired,
      followUpNote: normalizedFollowUpNote || null,
      attachmentNotes: normalizedAttachmentNotes || null,
    };
  }

  async function submitCreate() {
    const payload = boundCreate.current ?? createPayload();
    if (!payload) return;
    if (!boundCreate.current) boundCreate.current = payload;
    setCreateBusy(true);
    setCreateError("");
    setCreateFeedback("");
    try {
      const created = await createActionTaken(ticketId, payload);
      boundCreate.current = null;
      setCreateAmbiguous(false);
      setCurrentTicketVersion(created.ticketVersion);
      setCreateFeedback(created.replayed ? "Action saved successfully after reconciling the earlier request." : "Action saved successfully.");
      setDescription("");
      setResult("");
      setFollowUpRequired(false);
      setFollowUpNote("");
      setAttachmentNotes("");
      setAssigneeId(user ? String(user.id) : "");
      setShowCreate(false);
      setPage(1);
      setReload((value) => value + 1);
      await props.onTicketChanged?.(created.ticketVersion);
    } catch (caught) {
      if (caught instanceof SafeApiError) {
        const fieldErrors = caught.fieldErrors ?? {};
        setCreateFieldErrors(fieldErrors);
        if (Object.keys(fieldErrors).length > 0) queueMicrotask(() => focusCreateError(fieldErrors));
        setCreateError(caught.message);
        if (caught.status < 500) {
          boundCreate.current = null;
          if (caught.status === 409) setAssigneeReload((value) => value + 1);
        }
        else setCreateAmbiguous(true);
      } else {
        setCreateAmbiguous(true);
        setCreateError("The result is uncertain because the response was lost or the network failed. Retry will send the same Action with the same identifier and original data.");
      }
    } finally {
      setCreateBusy(false);
    }
  }

  function focusCreateError(errors: Record<string, string>) {
    const target = errors.description ? createDescriptionRef.current
      : errors.assigneeId ? createAssigneeRef.current
        : errors.result ? createResultRef.current
          : errors.followUpNote ? createFollowUpRef.current
            : errors.attachmentNotes ? createAttachmentRef.current
              : null;
    target?.focus();
  }
  return (
    <section className="lab2-readonly-section lab4-actions" aria-labelledby={`actions-heading-${ticketId}`}>
      <div className="lab4-actions-heading">
        <div>
          <h2 id={`actions-heading-${ticketId}`}>Actions Taken</h2>
          <p className="lab2-muted">Work recorded under {props.ticketNumber}.</p>
        </div>
        {mode === "staff" && response?.capabilities.canCreate && <button type="button" className="lab2-button lab2-button-primary" disabled={createBusy || createAmbiguous} onClick={openCreate}>Create Action</button>}
      </div>

      {createFeedback && <p className="lab2-status" role="status">{createFeedback}</p>}
      {mode === "staff" && showCreate && (
        <div className="lab4-action-editor" aria-label="Create Action form">
          <div className="lab4-action-editor-heading"><h3>Create Action</h3><button type="button" className="lab2-button lab2-button-secondary" disabled={createBusy || createAmbiguous} onClick={closeCreate}>Close</button></div>
          {createError && <p className={createAmbiguous ? "lab2-warning" : "lab2-error"} role="alert">{createError}</p>}
          {assigneeLoadError && <p className="lab2-error-text" role="alert">{assigneeLoadError}</p>}
          <div className="lab4-action-form-grid">
            <div className="lab2-field-group">
              <label htmlFor={`action-description-${ticketId}`}>Action Description</label>
              <textarea ref={createDescriptionRef} id={`action-description-${ticketId}`} value={description} maxLength={2000} disabled={createBusy || createAmbiguous} aria-invalid={Boolean(createFieldErrors.description)} aria-describedby={createFieldErrors.description ? `action-description-error-${ticketId}` : undefined} onChange={(event) => setDescription(event.target.value)} />
              {createFieldErrors.description && <p id={`action-description-error-${ticketId}`} role="alert">{createFieldErrors.description}</p>}
            </div>
            <div className="lab2-field-group">
              <label htmlFor={`action-assignee-${ticketId}`}>Assigned to</label>
              <select ref={createAssigneeRef} id={`action-assignee-${ticketId}`} value={assigneeId} disabled={createBusy || createAmbiguous || assignees.length === 0} aria-invalid={Boolean(createFieldErrors.assigneeId)} aria-describedby={createFieldErrors.assigneeId ? `action-assignee-error-${ticketId}` : undefined} onChange={(event) => setAssigneeId(event.target.value)}>
                <option value="">Select eligible assignee</option>
                {assignees.map((assignee) => <option key={assignee.id} value={assignee.id}>{assignee.name} ({roleLabel(assignee.role)})</option>)}
              </select>
              {createFieldErrors.assigneeId && <p id={`action-assignee-error-${ticketId}`} role="alert">{createFieldErrors.assigneeId}</p>}
            </div>
            <div className="lab2-field-group">
              <label htmlFor={`action-result-${ticketId}`}>Result</label>
              <textarea ref={createResultRef} id={`action-result-${ticketId}`} value={result} maxLength={2000} disabled={createBusy || createAmbiguous} aria-invalid={Boolean(createFieldErrors.result)} aria-describedby={createFieldErrors.result ? `action-result-error-${ticketId}` : undefined} onChange={(event) => setResult(event.target.value)} />
              {createFieldErrors.result && <p id={`action-result-error-${ticketId}`} role="alert">{createFieldErrors.result}</p>}
            </div>
            <div className="lab2-field-group">
              <label className="lab4-action-checkbox"><input type="checkbox" checked={followUpRequired} disabled={createBusy || createAmbiguous} onChange={(event) => setFollowUpRequired(event.target.checked)} /> Follow-Up Required</label>
            </div>
            {followUpRequired && <div className="lab2-field-group">
              <label htmlFor={`action-follow-up-${ticketId}`}>Follow-up Note</label>
              <textarea ref={createFollowUpRef} id={`action-follow-up-${ticketId}`} value={followUpNote} maxLength={2000} disabled={createBusy || createAmbiguous} aria-invalid={Boolean(createFieldErrors.followUpNote)} aria-describedby={createFieldErrors.followUpNote ? `action-follow-up-error-${ticketId}` : undefined} onChange={(event) => setFollowUpNote(event.target.value)} />
              {createFieldErrors.followUpNote && <p id={`action-follow-up-error-${ticketId}`} role="alert">{createFieldErrors.followUpNote}</p>}
            </div>}
            <div className="lab2-field-group">
              <label htmlFor={`action-attachment-notes-${ticketId}`}>Attachment Notes</label>
              <textarea ref={createAttachmentRef} id={`action-attachment-notes-${ticketId}`} value={attachmentNotes} maxLength={2000} disabled={createBusy || createAmbiguous} aria-invalid={Boolean(createFieldErrors.attachmentNotes)} aria-describedby={createFieldErrors.attachmentNotes ? `action-attachment-notes-error-${ticketId}` : undefined} onChange={(event) => setAttachmentNotes(event.target.value)} />
              {createFieldErrors.attachmentNotes && <p id={`action-attachment-notes-error-${ticketId}`} role="alert">{createFieldErrors.attachmentNotes}</p>}
            </div>
          </div>
          <p className="lab2-muted">Action Date/Time and Recorded by are set by the server. Performed by is set automatically only when the Action is completed.</p>
          <div className="lab4-action-buttons">
            <button type="button" className="lab2-button lab2-button-primary" disabled={createBusy || createAmbiguous || Boolean(assigneeLoadError)} onClick={() => void submitCreate()}>{createBusy ? "Saving Action..." : "Save Action"}</button>
            {createAmbiguous && <button type="button" className="lab2-button lab2-button-secondary" disabled={createBusy} onClick={() => void submitCreate()}>Retry same Action</button>}
          </div>
        </div>
      )}

      {state.kind === "loading" && <p className="lab2-status" role="status">Loading Actions Taken...</p>}
      {state.kind === "failure" && (
        <div className="lab2-error" role="alert">
          <p>Unable to load Actions Taken.</p>
          <button type="button" className="lab2-button lab2-button-secondary" onClick={() => setReload((value) => value + 1)}>Retry Actions Taken</button>
        </div>
      )}
      {response && response.totalItems === 0 && <p className="lab2-muted">No Actions Taken yet.</p>}
      {response && response.items.length > 0 && (
        <div className="lab4-action-list">
          {response.items.map((action) => <ActionCard
            key={action.id}
            ticketId={ticketId}
            ticketNumber={props.ticketNumber}
            action={action}
            currentTicketVersion={currentTicketVersion}
            assignees={assignees}
            onMutation={handleMutation}
            onConflict={handleConflict}
            onAssigneeConflict={() => setAssigneeReload((value) => value + 1)}
          />)}
        </div>
      )}
      {response && response.totalPages > 1 && (
        <nav className="lab2-pagination" aria-label="Actions Taken pagination">
          <button type="button" className="lab2-button lab2-button-secondary" disabled={response.page <= 1} onClick={() => setPage(response.page - 1)}>Previous</button>
          <span>Page {response.page} of {response.totalPages} ({response.totalItems} total)</span>
          <button type="button" className="lab2-button lab2-button-secondary" disabled={response.page >= response.totalPages} onClick={() => setPage(response.page + 1)}>Next</button>
        </nav>
      )}
    </section>
  );
}

function ActionCard({
  ticketId,
  ticketNumber,
  action,
  currentTicketVersion,
  assignees,
  onMutation,
  onConflict,
  onAssigneeConflict,
}: {
  ticketId: number;
  ticketNumber: string;
  action: ActionTakenPublic;
  currentTicketVersion: number;
  assignees: StaffUserSummary[];
  onMutation: (ticketVersion: number) => void | Promise<void>;
  onConflict: () => void | Promise<void>;
  onAssigneeConflict: () => void;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<Awaited<ReturnType<typeof fetchActionRevisions>> | null>(null);
  const [historyError, setHistoryError] = useState("");
  const [historyBusy, setHistoryBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [editResult, setEditResult] = useState("");
  const [editAssigneeId, setEditAssigneeId] = useState("");
  const [editFollowUpRequired, setEditFollowUpRequired] = useState(false);
  const [editFollowUpNote, setEditFollowUpNote] = useState("");
  const [editAttachmentNotes, setEditAttachmentNotes] = useState("");
  const [mutationBusy, setMutationBusy] = useState(false);
  const [mutationError, setMutationError] = useState("");
  const [mutationFieldErrors, setMutationFieldErrors] = useState<Record<string, string>>({});
  const [statusMode, setStatusMode] = useState<"complete" | "cancel" | null>(null);
  const [completeResult, setCompleteResult] = useState("");
  const [completeFollowUpRequired, setCompleteFollowUpRequired] = useState(false);
  const [completeFollowUpNote, setCompleteFollowUpNote] = useState("");
  const [completeConfirmed, setCompleteConfirmed] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelConfirmed, setCancelConfirmed] = useState(false);
  const editDescriptionRef = useRef<HTMLTextAreaElement>(null);
  const editAssigneeRef = useRef<HTMLSelectElement>(null);
  const editResultRef = useRef<HTMLTextAreaElement>(null);
  const editFollowUpRef = useRef<HTMLTextAreaElement>(null);
  const editAttachmentRef = useRef<HTMLTextAreaElement>(null);
  const completeResultRef = useRef<HTMLTextAreaElement>(null);
  const completeFollowUpRef = useRef<HTMLTextAreaElement>(null);
  const completeConfirmRef = useRef<HTMLInputElement>(null);
  const cancelReasonRef = useRef<HTMLTextAreaElement>(null);
  const cancelConfirmRef = useRef<HTMLInputElement>(null);

  function focusMutationError(errors: Record<string, string>) {
    const target = errors.description ? editDescriptionRef.current
      : errors.assigneeId ? editAssigneeRef.current
        : errors.result ? (completeResultRef.current ?? editResultRef.current)
          : errors.followUpNote ? (completeFollowUpRef.current ?? editFollowUpRef.current)
            : errors.attachmentNotes ? editAttachmentRef.current
              : errors.cancellationReason ? cancelReasonRef.current
                : errors.confirmation ? (completeConfirmRef.current ?? cancelConfirmRef.current)
                  : null;
    target?.focus();
  }

  function openEdit() {
    setEditDescription(action.description);
    setEditResult(action.result ?? "");
    setEditAssigneeId(String(action.assignee.id));
    setEditFollowUpRequired(action.followUpRequired);
    setEditFollowUpNote(action.followUpNote ?? "");
    setEditAttachmentNotes(action.attachmentNotes ?? "");
    setMutationError("");
    setMutationFieldErrors({});
    setEditing(true);
  }

  async function runMutation(operation: () => Promise<{ ticketVersion: number }>, closeOnSuccess: () => void) {
    setMutationBusy(true);
    setMutationError("");
    setMutationFieldErrors({});
    try {
      const result = await operation();
      closeOnSuccess();
      await onMutation(result.ticketVersion);
    } catch (caught) {
      if (caught instanceof SafeApiError) {
        setMutationError(caught.message);
        const fieldErrors = caught.fieldErrors ?? {};
        setMutationFieldErrors(fieldErrors);
        if (Object.keys(fieldErrors).length > 0) queueMicrotask(() => focusMutationError(fieldErrors));
        if (caught.status === 409) {
          onAssigneeConflict();
          await onConflict();
        }
      } else {
        setMutationError("Unable to update this Action. Your draft has been kept; try again when the connection is available.");
      }
    } finally {
      setMutationBusy(false);
    }
  }

  async function saveEdit() {
    const description = editDescription.trim();
    const result = editResult.trim();
    const followUpNote = editFollowUpNote.trim();
    const attachmentNotes = editAttachmentNotes.trim();
    const errors: Record<string, string> = {};
    if (!description) errors.description = "Action Description is required.";
    else if (Array.from(description).length > 2000) errors.description = "Action Description must contain at most 2000 characters.";
    if (Array.from(result).length > 2000) errors.result = "Result must contain at most 2000 characters.";
    if (editFollowUpRequired && !followUpNote) errors.followUpNote = "Follow-up Note is required when follow-up is required.";
    else if (Array.from(followUpNote).length > 2000) errors.followUpNote = "Follow-up Note must contain at most 2000 characters.";
    if (Array.from(attachmentNotes).length > 2000) errors.attachmentNotes = "Attachment Notes must contain at most 2000 characters.";
    const assigneeId = Number(editAssigneeId);
    if (action.capabilities.canReassign && (!Number.isSafeInteger(assigneeId) || assigneeId < 1)) errors.assigneeId = "Assignee is required.";
    if (Object.keys(errors).length > 0) {
      setMutationFieldErrors(errors);
      focusMutationError(errors);
      return;
    }
    await runMutation(
      () => updateActionTaken(ticketId, action.id, {
        expectedTicketVersion: currentTicketVersion,
        expectedActionVersion: action.version,
        description,
        result: result || null,
        ...(action.capabilities.canReassign ? { assigneeId } : {}),
        followUpRequired: editFollowUpRequired,
        followUpNote: followUpNote || null,
        attachmentNotes: attachmentNotes || null,
      }),
      () => setEditing(false),
    );
  }

  async function startAction() {
    await runMutation(
      () => updateActionStatus(ticketId, action.id, {
        expectedTicketVersion: currentTicketVersion,
        expectedActionVersion: action.version,
        status: "IN_PROGRESS",
      }),
      () => undefined,
    );
  }

  function openComplete() {
    setMutationError("");
    setMutationFieldErrors({});
    setCompleteResult(action.result ?? "");
    setCompleteFollowUpRequired(action.followUpRequired);
    setCompleteFollowUpNote(action.followUpNote ?? "");
    setCompleteConfirmed(false);
    setStatusMode("complete");
  }

  async function completeAction() {
    const result = completeResult.trim();
    const note = completeFollowUpNote.trim();
    const errors: Record<string, string> = {};
    if (!result) errors.result = "Result is required when completing an Action.";
    else if (Array.from(result).length > 2000) errors.result = "Result must contain at most 2000 characters.";
    if (completeFollowUpRequired && !note) errors.followUpNote = "Follow-up Note is required when follow-up is required.";
    else if (Array.from(note).length > 2000) errors.followUpNote = "Follow-up Note must contain at most 2000 characters.";
    if (!completeConfirmed) errors.confirmation = "Confirmation is required.";
    if (Object.keys(errors).length > 0) {
      setMutationFieldErrors(errors);
      focusMutationError(errors);
      return;
    }
    await runMutation(
      () => updateActionStatus(ticketId, action.id, {
        expectedTicketVersion: currentTicketVersion,
        expectedActionVersion: action.version,
        status: "COMPLETED",
        result,
        followUpRequired: completeFollowUpRequired,
        followUpNote: note || null,
        confirmation: true,
      }),
      () => setStatusMode(null),
    );
  }

  function openCancel() {
    setMutationError("");
    setMutationFieldErrors({});
    setCancelReason("");
    setCancelConfirmed(false);
    setStatusMode("cancel");
  }

  async function cancelAction() {
    const reason = cancelReason.trim();
    const errors: Record<string, string> = {};
    if (Array.from(reason).length < 3) errors.cancellationReason = "Cancellation reason must contain at least 3 characters.";
    else if (Array.from(reason).length > 200) errors.cancellationReason = "Cancellation reason must contain at most 200 characters.";
    if (!cancelConfirmed) errors.confirmation = "Confirmation is required.";
    if (Object.keys(errors).length > 0) {
      setMutationFieldErrors(errors);
      focusMutationError(errors);
      return;
    }
    await runMutation(
      () => updateActionStatus(ticketId, action.id, {
        expectedTicketVersion: currentTicketVersion,
        expectedActionVersion: action.version,
        status: "CANCELLED",
        cancellationReason: reason,
        confirmation: true,
      }),
      () => setStatusMode(null),
    );
  }

  async function toggleHistory() {
    if (showHistory) {
      setShowHistory(false);
      return;
    }
    setShowHistory(true);
    if (history) return;
    setHistoryBusy(true);
    setHistoryError("");
    try {
      setHistory(await fetchActionRevisions(ticketId, action.id));
    } catch {
      setHistoryError("Unable to load Action history.");
    } finally {
      setHistoryBusy(false);
    }
  }
  return (
    <article className="lab4-action-card" aria-labelledby={`action-heading-${action.id}`}>
      <div className="lab4-action-card-heading">
        <h3 id={`action-heading-${action.id}`}>Action #{action.id}</h3>
        <span className="lab4-action-status">{statusLabels[action.status]}</span>
      </div>
      <dl className="lab4-action-details">
        <dt>Action Date/Time</dt><dd>{formatDisplayDate(action.createdAt)}</dd>
        <dt>Action Description</dt><dd>{action.description}</dd>
        <dt>Result</dt><dd>{action.result ?? "Not recorded"}</dd>
        <dt>Recorded by</dt><dd>{action.recordedBy.name}</dd>
        <dt>Assigned to</dt><dd>{action.assignee.name} ({roleLabel(action.assignee.role)})</dd>
        <dt>Performed by</dt><dd>{action.performedBy?.name ?? "Not completed"}</dd>
        <dt>Follow-Up Required</dt><dd>{action.followUpRequired ? "Follow-up required" : "No follow-up required"}</dd>
        {action.followUpNote && <><dt>Follow-up Note</dt><dd>{action.followUpNote}</dd></>}
        <dt>Attachment Notes</dt><dd>{action.attachmentNotes ?? "None"}</dd>
        <dt>Work Cycle</dt><dd>{action.workflowCycle}</dd>
        {action.cancellationReason && <><dt>Cancellation Reason</dt><dd>{action.cancellationReason}</dd></>}
      </dl>
      {mutationError && <p className="lab2-error-text" role="alert">{mutationError}</p>}
      {editing && <div className="lab4-action-editor" aria-label={`Edit Action #${action.id}`}>
        {action.status === "COMPLETED" && <p className="lab2-warning">Corrections to completed Action content are audited in revision history. Assignment and lifecycle status remain read-only.</p>}
        <div className="lab4-action-form-grid">
          <div className="lab2-field-group"><label htmlFor={`edit-action-description-${action.id}`}>Edit Action Description</label><textarea ref={editDescriptionRef} id={`edit-action-description-${action.id}`} value={editDescription} maxLength={2000} disabled={mutationBusy} aria-invalid={Boolean(mutationFieldErrors.description)} aria-describedby={mutationFieldErrors.description ? `edit-action-description-error-${action.id}` : undefined} onChange={(event) => setEditDescription(event.target.value)} />{mutationFieldErrors.description && <p id={`edit-action-description-error-${action.id}`} role="alert">{mutationFieldErrors.description}</p>}</div>
          <div className="lab2-field-group"><label htmlFor={`edit-action-assignee-${action.id}`}>Edit Assigned to</label><select ref={editAssigneeRef} id={`edit-action-assignee-${action.id}`} value={editAssigneeId} disabled={mutationBusy || !action.capabilities.canReassign} aria-invalid={Boolean(mutationFieldErrors.assigneeId)} aria-describedby={mutationFieldErrors.assigneeId ? `edit-action-assignee-error-${action.id}` : undefined} onChange={(event) => setEditAssigneeId(event.target.value)}>{assignees.map((assignee) => <option key={assignee.id} value={assignee.id}>{assignee.name} ({roleLabel(assignee.role)})</option>)}</select>{mutationFieldErrors.assigneeId && <p id={`edit-action-assignee-error-${action.id}`} role="alert">{mutationFieldErrors.assigneeId}</p>}</div>
          <div className="lab2-field-group"><label htmlFor={`edit-action-result-${action.id}`}>Edit Result</label><textarea ref={editResultRef} id={`edit-action-result-${action.id}`} value={editResult} maxLength={2000} disabled={mutationBusy} aria-invalid={Boolean(mutationFieldErrors.result)} aria-describedby={mutationFieldErrors.result ? `edit-action-result-error-${action.id}` : undefined} onChange={(event) => setEditResult(event.target.value)} />{mutationFieldErrors.result && <p id={`edit-action-result-error-${action.id}`} role="alert">{mutationFieldErrors.result}</p>}</div>
          <div className="lab2-field-group"><label className="lab4-action-checkbox"><input type="checkbox" checked={editFollowUpRequired} disabled={mutationBusy} onChange={(event) => setEditFollowUpRequired(event.target.checked)} /> Edit Follow-Up Required</label></div>
          {editFollowUpRequired && <div className="lab2-field-group"><label htmlFor={`edit-action-follow-up-${action.id}`}>Edit Follow-up Note</label><textarea ref={editFollowUpRef} id={`edit-action-follow-up-${action.id}`} value={editFollowUpNote} maxLength={2000} disabled={mutationBusy} aria-invalid={Boolean(mutationFieldErrors.followUpNote)} aria-describedby={mutationFieldErrors.followUpNote ? `edit-action-follow-up-error-${action.id}` : undefined} onChange={(event) => setEditFollowUpNote(event.target.value)} />{mutationFieldErrors.followUpNote && <p id={`edit-action-follow-up-error-${action.id}`} role="alert">{mutationFieldErrors.followUpNote}</p>}</div>}
          <div className="lab2-field-group"><label htmlFor={`edit-action-attachment-notes-${action.id}`}>Edit Attachment Notes</label><textarea ref={editAttachmentRef} id={`edit-action-attachment-notes-${action.id}`} value={editAttachmentNotes} maxLength={2000} disabled={mutationBusy} aria-invalid={Boolean(mutationFieldErrors.attachmentNotes)} aria-describedby={mutationFieldErrors.attachmentNotes ? `edit-action-attachment-notes-error-${action.id}` : undefined} onChange={(event) => setEditAttachmentNotes(event.target.value)} />{mutationFieldErrors.attachmentNotes && <p id={`edit-action-attachment-notes-error-${action.id}`} role="alert">{mutationFieldErrors.attachmentNotes}</p>}</div>
        </div>
        <div className="lab4-action-buttons"><button type="button" className="lab2-button lab2-button-primary" disabled={mutationBusy} onClick={() => void saveEdit()}>{mutationBusy ? "Saving..." : "Save Action changes"}</button><button type="button" className="lab2-button lab2-button-secondary" disabled={mutationBusy} onClick={() => setEditing(false)}>Cancel edit</button></div>
      </div>}

      {statusMode === "complete" && <div className="lab4-action-editor" aria-label={`Complete Action #${action.id}`}>
        <p className="lab2-warning">Complete {ticketNumber}, Action #{action.id} ({action.description}): {statusLabels[action.status]} → Completed. The authenticated completing actor will be recorded as Performed by, and the Action cannot return to an earlier status.</p>
        <div className="lab2-field-group"><label htmlFor={`complete-action-result-${action.id}`}>Completion Result</label><textarea ref={completeResultRef} id={`complete-action-result-${action.id}`} value={completeResult} maxLength={2000} disabled={mutationBusy} aria-invalid={Boolean(mutationFieldErrors.result)} aria-describedby={mutationFieldErrors.result ? `complete-action-result-error-${action.id}` : undefined} onChange={(event) => setCompleteResult(event.target.value)} />{mutationFieldErrors.result && <p id={`complete-action-result-error-${action.id}`} role="alert">{mutationFieldErrors.result}</p>}</div>
        <label className="lab4-action-checkbox"><input type="checkbox" checked={completeFollowUpRequired} disabled={mutationBusy} onChange={(event) => setCompleteFollowUpRequired(event.target.checked)} /> Follow-Up Required after completion</label>
        {completeFollowUpRequired && <div className="lab2-field-group"><label htmlFor={`complete-action-follow-up-${action.id}`}>Completion Follow-up Note</label><textarea ref={completeFollowUpRef} id={`complete-action-follow-up-${action.id}`} value={completeFollowUpNote} maxLength={2000} disabled={mutationBusy} aria-invalid={Boolean(mutationFieldErrors.followUpNote)} aria-describedby={mutationFieldErrors.followUpNote ? `complete-action-follow-up-error-${action.id}` : undefined} onChange={(event) => setCompleteFollowUpNote(event.target.value)} />{mutationFieldErrors.followUpNote && <p id={`complete-action-follow-up-error-${action.id}`} role="alert">{mutationFieldErrors.followUpNote}</p>}</div>}
        <label className="lab4-action-checkbox"><input ref={completeConfirmRef} type="checkbox" checked={completeConfirmed} disabled={mutationBusy} aria-invalid={Boolean(mutationFieldErrors.confirmation)} aria-describedby={mutationFieldErrors.confirmation ? `complete-action-confirmation-error-${action.id}` : undefined} onChange={(event) => setCompleteConfirmed(event.target.checked)} /> Confirm Action completion</label>{mutationFieldErrors.confirmation && <p id={`complete-action-confirmation-error-${action.id}`} className="lab2-error-text" role="alert">{mutationFieldErrors.confirmation}</p>}
        <div className="lab4-action-buttons"><button type="button" className="lab2-button lab2-button-primary" disabled={mutationBusy} onClick={() => void completeAction()}>Confirm complete Action</button><button type="button" className="lab2-button lab2-button-secondary" disabled={mutationBusy} onClick={() => setStatusMode(null)}>Cancel completion</button></div>
      </div>}

      {statusMode === "cancel" && <div className="lab4-action-editor" aria-label={`Cancel Action #${action.id}`}>
        <p className="lab2-warning">Cancel {ticketNumber}, Action #{action.id} ({action.description}): {statusLabels[action.status]} → Cancelled. This Action becomes read-only and remains visible in history.</p>
        <div className="lab2-field-group"><label htmlFor={`cancel-action-reason-${action.id}`}>Cancellation Reason</label><textarea ref={cancelReasonRef} id={`cancel-action-reason-${action.id}`} value={cancelReason} maxLength={200} disabled={mutationBusy} aria-invalid={Boolean(mutationFieldErrors.cancellationReason)} aria-describedby={mutationFieldErrors.cancellationReason ? `cancel-action-reason-error-${action.id}` : undefined} onChange={(event) => setCancelReason(event.target.value)} />{mutationFieldErrors.cancellationReason && <p id={`cancel-action-reason-error-${action.id}`} role="alert">{mutationFieldErrors.cancellationReason}</p>}</div>
        <label className="lab4-action-checkbox"><input ref={cancelConfirmRef} type="checkbox" checked={cancelConfirmed} disabled={mutationBusy} aria-invalid={Boolean(mutationFieldErrors.confirmation)} aria-describedby={mutationFieldErrors.confirmation ? `cancel-action-confirmation-error-${action.id}` : undefined} onChange={(event) => setCancelConfirmed(event.target.checked)} /> Confirm Action cancellation</label>{mutationFieldErrors.confirmation && <p id={`cancel-action-confirmation-error-${action.id}`} className="lab2-error-text" role="alert">{mutationFieldErrors.confirmation}</p>}
        <div className="lab4-action-buttons"><button type="button" className="lab2-button lab2-button-destructive" disabled={mutationBusy} onClick={() => void cancelAction()}>Confirm cancel Action</button><button type="button" className="lab2-button lab2-button-secondary" disabled={mutationBusy} onClick={() => setStatusMode(null)}>Keep Action</button></div>
      </div>}
      <div className="lab4-action-buttons">
        {action.capabilities.canEdit && <button type="button" className="lab2-button lab2-button-secondary" disabled={mutationBusy || editing} onClick={openEdit}>Edit Action #{action.id}</button>}
        {action.capabilities.permittedTransitions.includes("IN_PROGRESS") && <button type="button" className="lab2-button lab2-button-secondary" disabled={mutationBusy} onClick={() => void startAction()}>Start Action #{action.id}</button>}
        {action.capabilities.permittedTransitions.includes("COMPLETED") && <button type="button" className="lab2-button lab2-button-primary" disabled={mutationBusy} onClick={openComplete}>Complete Action #{action.id}</button>}
        {action.capabilities.permittedTransitions.includes("CANCELLED") && <button type="button" className="lab2-button lab2-button-destructive" disabled={mutationBusy} onClick={openCancel}>Cancel Action #{action.id}</button>}
        <button type="button" className="lab2-button lab2-button-secondary" onClick={() => void toggleHistory()}>{showHistory ? `Hide history for Action #${action.id}` : `History for Action #${action.id}`}</button>
      </div>
      {showHistory && <div className="lab4-action-history">
        {historyBusy && <p className="lab2-status" role="status">Loading Action history...</p>}
        {historyError && <p className="lab2-error-text" role="alert">{historyError}</p>}
        {history && history.items.length === 0 && <p className="lab2-muted">No Action history recorded.</p>}
        {history?.items.map((revision) => <article key={revision.actionVersion} className="lab4-action-revision">
          <h4>Version {revision.actionVersion}: {revision.eventType}</h4>
          <p>{revision.eventType.charAt(0) + revision.eventType.slice(1).toLowerCase()} by {revision.actor.name} on {formatDisplayDate(revision.occurredAt)}</p>
          <dl className="lab4-action-details">
            <dt>Description</dt><dd>{revision.snapshot.description ?? "Not recorded"}</dd>
            <dt>Result</dt><dd>{revision.snapshot.result ?? "Not recorded"}</dd>
            <dt>Status</dt><dd>{revision.snapshot.status ? statusLabels[revision.snapshot.status] : "Not recorded"}</dd>
            <dt>Assigned to</dt><dd>{revision.snapshot.assignee?.name ?? "Not recorded"}</dd>
            <dt>Performed by</dt><dd>{revision.snapshot.performedBy?.name ?? "Not completed"}</dd>
          </dl>
        </article>)}
      </div>}
    </article>
  );
}
