import { useCallback, useEffect, useRef, useState } from "react";
import { fetchCategories, SafeApiError, type Category, type RequestedPriority } from "../api.js";
import { useAuth } from "../auth-context.js";
import { formatDisplayDate } from "../date-format.js";
import { TICKET_STATUSES, ticketStatusClassName, ticketStatusLabel, type TicketStatus } from "../ticket-status.js";
import { fetchStaffAssignees, fetchStaffQueue, staffQueueContext, type StaffPageSize, type StaffQueueItem, type StaffQueueQuery, type StaffQueueResponse, type StaffSortDirection, type StaffSortField, type StaffUserSummary } from "../api/staff.js";

type AppliedQuery = Required<Pick<StaffQueueQuery, "owner" | "sortBy" | "sortDirection" | "page" | "pageSize">> & Omit<StaffQueueQuery, "owner" | "sortBy" | "sortDirection" | "page" | "pageSize">;
const DEFAULT: AppliedQuery = { owner: "all", sortBy: "updatedAt", sortDirection: "desc", page: 1, pageSize: 10 };
const priorities: RequestedPriority[] = ["LOW", "MEDIUM", "HIGH"];
const pageSizes: StaffPageSize[] = [10, 20, 50];
const sortFields: Array<{ value: StaffSortField; label: string }> = [
  { value: "updatedAt", label: "Last Updated" }, { value: "createdAt", label: "Created" }, { value: "ticketNumber", label: "Ticket Number" }, { value: "itPriority", label: "IT Priority" },
];

function parseContext(value: string): AppliedQuery {
  const p = new URLSearchParams(value.replace(/^\?/, ""));
  const page = Number(p.get("page")); const pageSize = Number(p.get("pageSize")); const owner = p.get("owner");
  return {
    ...(p.get("search") ? { search: p.get("search")! } : {}), ...(Number(p.get("categoryId")) > 0 ? { categoryId: Number(p.get("categoryId")) } : {}),
    ...(p.get("currentStatus") ? { currentStatus: p.get("currentStatus") as TicketStatus } : {}),
    ...(p.get("requestedPriority") ? { requestedPriority: p.get("requestedPriority") as RequestedPriority } : {}),
    ...(p.get("itPriority") ? { itPriority: p.get("itPriority") as RequestedPriority } : {}),
    owner: owner === "me" || owner === "unassigned" || owner === "all" ? owner : Number(owner) > 0 ? Number(owner) : "all",
    sortBy: (["updatedAt", "createdAt", "ticketNumber", "itPriority"].includes(p.get("sortBy") ?? "") ? p.get("sortBy") : "updatedAt") as StaffSortField,
    sortDirection: p.get("sortDirection") === "asc" ? "asc" : "desc",
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    pageSize: ([10, 20, 50].includes(pageSize) ? pageSize : 10) as StaffPageSize,
  };
}
function restricted(q: AppliedQuery) { return Boolean(q.search || q.categoryId || q.currentStatus || q.requestedPriority || q.itPriority || q.owner !== "all"); }
function priorityLabel(v: RequestedPriority) { return v[0] + v.slice(1).toLowerCase(); }
type State = { kind: "loading" } | { kind: "forbidden" } | { kind: "failure"; message: string } | { kind: "success"; response: StaffQueueResponse; zero?: "empty" | "no-results" };

export default function StaffTicketQueue({ onViewTicket, initialContext = "", initialSearch = "" }: { onViewTicket?: (id: number, context: string) => void; initialContext?: string; initialSearch?: string }) {
  const { user } = useAuth();
  const initial = parseContext(initialContext);
  if (initialSearch && !initial.search) initial.search = initialSearch;
  const [query, setQuery] = useState<AppliedQuery>(initial);
  const [draftSearch, setDraftSearch] = useState(initial.search ?? "");
  const [state, setState] = useState<State>({ kind: "loading" });
  const [reload, setReload] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [assignees, setAssignees] = useState<StaffUserSummary[]>([]);
  const suppress = useRef(false);

  const loadChoices = useCallback(() => {
    void fetchCategories().then(setCategories).catch(() => setCategories([]));
    void fetchStaffAssignees().then(setAssignees).catch(() => setAssignees([]));
  }, []);
  useEffect(loadChoices, [loadChoices]);

  useEffect(() => {
    if (suppress.current) { suppress.current = false; return; }
    let active = true; const requested = { ...query }; setState({ kind: "loading" });
    void (async () => {
      try {
        let response = await fetchStaffQueue(requested);
        if (response.totalItems > 0 && response.items.length === 0 && response.page > response.totalPages && response.totalPages > 0) {
          response = await fetchStaffQueue({ ...requested, page: response.totalPages });
          if (active && response.page !== query.page) { suppress.current = true; setQuery((current) => ({ ...current, page: response.page })); }
        }
        if (!active) return;
        let zero: "empty" | "no-results" | undefined;
        if (response.totalItems === 0 && restricted(requested)) {
          const probe = await fetchStaffQueue(DEFAULT); if (!active) return; zero = probe.totalItems > 0 ? "no-results" : "empty";
        } else if (response.totalItems === 0) zero = "empty";
        setState({ kind: "success", response, zero });
      } catch (error) {
        if (!active) return;
        if (error instanceof SafeApiError && error.status === 403 && error.code === "FORBIDDEN") setState({ kind: "forbidden" });
        else setState({ kind: "failure", message: error instanceof SafeApiError ? error.message : "Unable to load Staff Ticket Queue" });
      }
    })();
    return () => { active = false; };
  }, [query.search, query.categoryId, query.currentStatus, query.requestedPriority, query.itPriority, query.owner, query.sortBy, query.sortDirection, query.page, query.pageSize, reload]);

  const change = <K extends keyof AppliedQuery>(key: K, value: AppliedQuery[K]) => setQuery((q) => ({ ...q, [key]: value, page: 1 }));
  const clear = () => { setDraftSearch(""); setQuery(DEFAULT); };
  const response = state.kind === "success" ? state.response : null;
  return <section className="lab3-staff-queue" aria-labelledby="staff-queue-heading">
    <div className="lab2-list-heading"><div><h1 id="staff-queue-heading">Ticket Queue</h1><p className="lab2-muted">Shared workload for IT Staff{user?.role === "ADMINISTRATOR" ? " and Administrators" : ""}</p></div></div>
    <form className="lab2-ticket-controls lab3-staff-controls" onSubmit={(e) => { e.preventDefault(); const s = draftSearch.trim(); setQuery((q) => ({ ...q, search: s || undefined, page: 1 })); }}>
      <div className="lab2-field-group lab2-search-field"><label htmlFor="staff-search">Search Ticket Number, Summary, or Requester</label><input id="staff-search" type="search" value={draftSearch} onChange={(e) => setDraftSearch(e.target.value)} maxLength={120} /></div>
      <button className="lab2-button lab2-button-primary" type="submit">Search</button>
      <Filter label="Category" id="staff-category" value={query.categoryId ?? ""} onChange={(v) => change("categoryId", v ? Number(v) : undefined)} options={categories.map((x) => [String(x.id), x.name])} all="All Categories" />
      <Filter label="Current Status" id="staff-status" value={query.currentStatus ?? ""} onChange={(v) => change("currentStatus", v ? v as TicketStatus : undefined)} options={TICKET_STATUSES.map((x) => [x, ticketStatusLabel(x)])} all="All Statuses" />
      <Filter label="Requested Priority" id="staff-requested-priority" value={query.requestedPriority ?? ""} onChange={(v) => change("requestedPriority", v ? v as RequestedPriority : undefined)} options={priorities.map((x) => [x, priorityLabel(x)])} all="All Priorities" />
      <Filter label="IT Priority" id="staff-it-priority" value={query.itPriority ?? ""} onChange={(v) => change("itPriority", v ? v as RequestedPriority : undefined)} options={priorities.map((x) => [x, priorityLabel(x)])} all="All Priorities" />
      <Filter label="Owner" id="staff-owner" value={typeof query.owner === "number" ? String(query.owner) : query.owner} onChange={(v) => change("owner", v === "all" || v === "me" || v === "unassigned" ? v : Number(v))} options={[["unassigned", "Unassigned"], ["me", "Mine"], ...assignees.map((x) => [String(x.id), `${x.name} (${x.role === "IT_STAFF" ? "IT Staff" : "Administrator"})`])]} all="All Owners" />
      <Filter label="Sort by" id="staff-sort" value={query.sortBy} onChange={(v) => change("sortBy", v as StaffSortField)} options={sortFields.map((x) => [x.value, x.label])} />
      <Filter label="Sort direction" id="staff-direction" value={query.sortDirection} onChange={(v) => change("sortDirection", v as StaffSortDirection)} options={[["desc", "Descending"], ["asc", "Ascending"]]} />
      <Filter label="Page size" id="staff-page-size" value={String(query.pageSize)} onChange={(v) => change("pageSize", Number(v) as StaffPageSize)} options={pageSizes.map((x) => [String(x), String(x)])} />
      <button className="lab2-button lab2-button-secondary" type="button" onClick={clear}>Clear search/filters</button>
    </form>
    <div className="lab2-list-region" aria-busy={state.kind === "loading"}>
      {state.kind === "loading" && <p className="lab2-status" role="status">Loading queue...</p>}
      {state.kind === "forbidden" && <div className="lab2-error" role="alert"><h2>Access Denied</h2><p>You do not have permission to open the Staff Ticket Queue.</p></div>}
      {state.kind === "failure" && <div className="lab2-error" role="alert"><p>{state.message}</p><button className="lab2-button lab2-button-secondary" type="button" onClick={() => setReload((v) => v + 1)}>Retry</button></div>}
      {state.kind === "success" && state.zero === "empty" && <div className="lab2-status lab2-list-empty" role="status"><h2>No tickets in the queue</h2><p>There are no Tickets to work on yet.</p></div>}
      {state.kind === "success" && state.zero === "no-results" && <div className="lab2-status lab2-list-empty" role="status"><h2>No matching tickets</h2><p>The current search or filters found no Tickets.</p><button className="lab2-button lab2-button-secondary" type="button" onClick={clear}>Clear search/filters</button></div>}
      {response && response.items.length > 0 && <><div className="lab2-table-wrap"><table className="lab2-ticket-table lab3-staff-table"><caption className="visually-hidden">Shared Staff Ticket Queue</caption><thead><tr><th>Ticket Number</th><th>Summary</th><th>Requester</th><th>Requested Priority</th><th>IT Priority</th><th>Current Status</th><th>Owner</th><th>Last Updated</th><th>Action</th></tr></thead><tbody>{response.items.map((t) => <QueueRow key={t.id} ticket={t} onView={() => onViewTicket?.(t.id, staffQueueContext({ ...query, page: response.page }))} />)}</tbody></table></div><div className="lab2-ticket-cards lab3-staff-cards" aria-label="Ticket Queue cards">{response.items.map((t) => <QueueCard key={t.id} ticket={t} onView={() => onViewTicket?.(t.id, staffQueueContext({ ...query, page: response.page }))} />)}</div></>}
    </div>
    {response && response.totalPages > 0 && <nav className="lab2-pagination" aria-label="Ticket Queue pagination"><button className="lab2-button lab2-button-secondary" type="button" disabled={response.page <= 1} onClick={() => setQuery((q) => ({ ...q, page: response.page - 1 }))}>Previous</button><span>Page {response.page} of {response.totalPages} ({response.totalItems} total)</span><button className="lab2-button lab2-button-secondary" type="button" disabled={response.page >= response.totalPages} onClick={() => setQuery((q) => ({ ...q, page: response.page + 1 }))}>Next</button></nav>}
  </section>;
}

function Filter({ label, id, value, onChange, options, all }: { label: string; id: string; value: string | number; onChange: (v: string) => void; options: string[][]; all?: string }) {
  return <div className="lab2-field-group"><label htmlFor={id}>{label}</label><select id={id} value={value} onChange={(e) => onChange(e.target.value)}>{all !== undefined && <option value={label === "Owner" ? "all" : ""}>{all}</option>}{options.map(([v, text]) => <option key={v} value={v}>{text}</option>)}</select></div>;
}
function Badge({ value, kind }: { value: RequestedPriority; kind: "priority" }) { void kind; return <span className={`lab2-badge lab2-priority-${value.toLowerCase()}`}>{priorityLabel(value)}</span>; }
function QueueRow({ ticket: t, onView }: { ticket: StaffQueueItem; onView: () => void }) { return <tr><th scope="row">{t.ticketNumber}</th><td className="lab2-summary-cell">{t.summary}</td><td>{t.requester.name}</td><td><Badge value={t.requestedPriority} kind="priority" /></td><td><Badge value={t.itPriority} kind="priority" /></td><td><span className={`lab2-badge ${ticketStatusClassName(t.currentStatus)}`}>{ticketStatusLabel(t.currentStatus)}</span></td><td>{t.owner?.name ?? "Unassigned"}</td><td>{formatDisplayDate(t.updatedAt)}</td><td><button className="lab2-button lab2-button-secondary" type="button" onClick={onView}>View ticket</button></td></tr>; }
function QueueCard({ ticket: t, onView }: { ticket: StaffQueueItem; onView: () => void }) { return <article className="lab2-ticket-card"><h2>{t.ticketNumber}</h2><p className="lab2-ticket-card-summary">{t.summary}</p><dl><dt>Requester</dt><dd>{t.requester.name}</dd><dt>Requested Priority</dt><dd><Badge value={t.requestedPriority} kind="priority" /></dd><dt>IT Priority</dt><dd><Badge value={t.itPriority} kind="priority" /></dd><dt>Current Status</dt><dd>{ticketStatusLabel(t.currentStatus)}</dd><dt>Owner</dt><dd>{t.owner?.name ?? "Unassigned"}</dd><dt>Last Updated</dt><dd>{formatDisplayDate(t.updatedAt)}</dd></dl><button className="lab2-button lab2-button-secondary" type="button" onClick={onView}>View ticket</button></article>; }
