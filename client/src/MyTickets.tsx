import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchCategories,
  fetchMyTickets,
  SafeApiError,
  type Category,
  type TicketListItem,
  type TicketListQuery,
  type TicketListResponse,
  type TicketPageSize,
  type TicketSortDirection,
  type TicketSortField,
  type RequestedPriority,
} from "./api.js";
import { useRequesterContext } from "./requester-context.js";

type AppliedQuery = Required<Pick<TicketListQuery, "sortBy" | "sortDirection" | "page" | "pageSize">>
  & Omit<TicketListQuery, "sortBy" | "sortDirection" | "page" | "pageSize">;

const DEFAULT_QUERY: AppliedQuery = {
  sortBy: "updatedAt",
  sortDirection: "desc",
  page: 1,
  pageSize: 10,
};

const priorities: RequestedPriority[] = ["LOW", "MEDIUM", "HIGH"];
const sortFields: Array<{ value: TicketSortField; label: string }> = [
  { value: "updatedAt", label: "Last Updated" },
  { value: "createdAt", label: "Created" },
  { value: "ticketNumber", label: "Ticket Number" },
  { value: "summary", label: "Summary" },
];
const pageSizes: TicketPageSize[] = [10, 20, 50];

type ListState =
  | { kind: "loading" }
  | { kind: "failure"; message: string }
  | { kind: "success"; response: TicketListResponse; zeroKind?: "empty" | "no-results" };

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function priorityLabel(priority: RequestedPriority): string {
  return `${priority.charAt(0)}${priority.slice(1).toLowerCase()}`;
}

function restricted(query: AppliedQuery): boolean {
  return Boolean(query.search || query.categoryId || query.requestedPriority || query.currentStatus);
}

function safeFailureMessage(error: unknown): string {
  return error instanceof SafeApiError
    ? error.message
    : "Unable to load tickets. Please try again.";
}

interface MyTicketsProps {
  onCreateTicket?: () => void;
}

export default function MyTickets({ onCreateTicket }: MyTicketsProps) {
  const { currentRequester } = useRequesterContext();
  const requesterId = currentRequester?.id;
  const [draftSearch, setDraftSearch] = useState("");
  const [query, setQuery] = useState<AppliedQuery>(DEFAULT_QUERY);
  const [result, setResult] = useState<ListState>({ kind: "loading" });
  const [reloadToken, setReloadToken] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryState, setCategoryState] = useState<"loading" | "ready" | "error">("loading");
  const [categoryError, setCategoryError] = useState("");
  const suppressNextQueryFetch = useRef(false);
  const requesterRef = useRef<number | undefined>(requesterId);

  const loadCategories = useCallback(async () => {
    setCategoryState("loading");
    setCategoryError("");
    try {
      const loaded = await fetchCategories();
      setCategories(loaded);
      setCategoryState("ready");
    } catch {
      setCategoryState("error");
      setCategoryError("Unable to load Categories. Please try again.");
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories, requesterId]);

  useEffect(() => {
    if (!requesterId) {
      requesterRef.current = undefined;
      return;
    }

    // AppShell remounts requester-scoped pages, but this guard also makes the
    // component safe when it is embedded without that boundary. The first
    // fetch after a change uses clean defaults rather than the old Requester
    // query, and the state reset's follow-up effect is suppressed once.
    const requesterChanged = requesterRef.current !== undefined && requesterRef.current !== requesterId;
    requesterRef.current = requesterId;
    if (requesterChanged) {
      const alreadyAtDefaults = !query.search
        && query.categoryId === undefined
        && query.requestedPriority === undefined
        && query.currentStatus === undefined
        && query.sortBy === DEFAULT_QUERY.sortBy
        && query.sortDirection === DEFAULT_QUERY.sortDirection
        && query.page === DEFAULT_QUERY.page
        && query.pageSize === DEFAULT_QUERY.pageSize;
      setDraftSearch("");
      setQuery(DEFAULT_QUERY);
      setResult({ kind: "loading" });
      suppressNextQueryFetch.current = !alreadyAtDefaults;
    }
    if (suppressNextQueryFetch.current && !requesterChanged) {
      suppressNextQueryFetch.current = false;
      return;
    }

    let active = true;
    const requestedQuery = requesterChanged ? { ...DEFAULT_QUERY } : { ...query };
    setResult({ kind: "loading" });

    const run = async () => {
      try {
        let response = await fetchMyTickets(requesterId, requestedQuery);
        if (
          response.totalItems > 0
          && response.items.length === 0
          && response.page > response.totalPages
          && response.totalPages > 0
        ) {
          // The API deliberately treats a positive out-of-range page as a
          // valid empty result. Recover once, then display the final page.
          const finalPage = response.totalPages;
          response = await fetchMyTickets(requesterId, { ...requestedQuery, page: finalPage });
          if (active && response.page !== query.page) {
            suppressNextQueryFetch.current = true;
            setQuery((current) => current.page === requestedQuery.page
              ? { ...current, page: response.page }
              : current);
          }
        }
        if (!active) return;

        let zeroKind: "empty" | "no-results" | undefined;
        if (response.items.length === 0 && response.totalItems === 0 && restricted(requestedQuery)) {
          // This is the one allowed ownership probe. It intentionally sends
          // only page=1 and pageSize=10, with no search/filter restrictions.
          const probe = await fetchMyTickets(requesterId, { page: 1, pageSize: 10 });
          if (!active) return;
          zeroKind = probe.totalItems > 0 ? "no-results" : "empty";
        } else if (response.items.length === 0 && response.totalItems === 0) {
          zeroKind = "empty";
        }
        setResult({ kind: "success", response, zeroKind });
      } catch (error) {
        if (active) setResult({ kind: "failure", message: safeFailureMessage(error) });
      }
    };
    void run();
    return () => { active = false; };
    // Explicit scalar dependencies avoid refetching for unrelated state.
  }, [requesterId, query.search, query.categoryId, query.requestedPriority, query.currentStatus,
    query.sortBy, query.sortDirection, query.page, query.pageSize, reloadToken]);

  const applySearch = () => {
    const search = draftSearch.trim();
    setQuery((current) => ({ ...current, ...(search ? { search } : { search: undefined }), page: 1 }));
  };

  const clearQuery = () => {
    setDraftSearch("");
    setQuery(DEFAULT_QUERY);
  };

  const changeQuery = <K extends keyof AppliedQuery>(key: K, value: AppliedQuery[K]) => {
    setQuery((current) => ({ ...current, [key]: value, page: 1 }));
  };

  const response = result.kind === "success" ? result.response : null;
  const noResults = result.kind === "success" && result.zeroKind === "no-results";
  const empty = result.kind === "success" && result.zeroKind === "empty";

  return (
    <section className="lab2-my-tickets" aria-labelledby="my-tickets-heading">
      <div className="lab2-list-heading">
        <div>
          <h1 id="my-tickets-heading">My Tickets</h1>
          <p className="lab2-muted">Tickets owned by {currentRequester?.name ?? "the selected Requester"}</p>
        </div>
        <button type="button" className="lab2-button lab2-button-primary" onClick={() => onCreateTicket?.()}>Create Ticket</button>
      </div>

      <form className="lab2-ticket-controls" onSubmit={(event) => { event.preventDefault(); applySearch(); }}>
        <div className="lab2-field-group lab2-search-field">
          <label htmlFor="my-tickets-search">Search Ticket Number or Summary</label>
          <input
            id="my-tickets-search"
            type="search"
            value={draftSearch}
            onChange={(event) => setDraftSearch(event.target.value)}
            placeholder="Search your tickets"
          />
        </div>
        <button type="submit" className="lab2-button lab2-button-primary">Search</button>

        <div className="lab2-field-group">
          <label htmlFor="my-tickets-category">Category</label>
          <select
            id="my-tickets-category"
            value={query.categoryId ?? ""}
            onChange={(event) => changeQuery("categoryId", event.target.value ? Number(event.target.value) : undefined)}
          >
            <option value="">All Categories</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          {categoryState === "loading" && <span className="lab2-muted" role="status">Loading Categories...</span>}
          {categoryState === "error" && <span className="lab2-error-text" role="alert">{categoryError} <button type="button" onClick={() => { void loadCategories(); }}>Retry Categories</button></span>}
        </div>

        <div className="lab2-field-group">
          <label htmlFor="my-tickets-priority">Requested Priority</label>
          <select id="my-tickets-priority" value={query.requestedPriority ?? ""}
            onChange={(event) => changeQuery("requestedPriority", event.target.value ? event.target.value as RequestedPriority : undefined)}>
            <option value="">All Priorities</option>
            {priorities.map((priority) => <option key={priority} value={priority}>{priorityLabel(priority)}</option>)}
          </select>
        </div>

        <div className="lab2-field-group">
          <label htmlFor="my-tickets-status">Current Status</label>
          <select id="my-tickets-status" value={query.currentStatus ?? ""}
            onChange={(event) => changeQuery("currentStatus", event.target.value ? "NEW" : undefined)}>
            <option value="">All Statuses</option>
            <option value="NEW">New</option>
          </select>
        </div>

        <div className="lab2-field-group">
          <label htmlFor="my-tickets-sort">Sort by</label>
          <select id="my-tickets-sort" value={query.sortBy}
            onChange={(event) => changeQuery("sortBy", event.target.value as TicketSortField)}>
            {sortFields.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>

        <div className="lab2-field-group">
          <label htmlFor="my-tickets-direction">Sort direction</label>
          <select id="my-tickets-direction" value={query.sortDirection}
            onChange={(event) => changeQuery("sortDirection", event.target.value as TicketSortDirection)}>
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>

        <div className="lab2-field-group">
          <label htmlFor="my-tickets-page-size">Page size</label>
          <select id="my-tickets-page-size" value={query.pageSize}
            onChange={(event) => changeQuery("pageSize", Number(event.target.value) as TicketPageSize)}>
            {pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </div>
        <button type="button" className="lab2-button lab2-button-secondary" onClick={clearQuery}>Clear search/filters</button>
      </form>

      <div className="lab2-list-region" aria-busy={result.kind === "loading"}>
        {result.kind === "loading" && <p className="lab2-status" role="status">Loading tickets...</p>}
        {result.kind === "failure" && (
          <div className="lab2-error" role="alert">
            <p>{result.message}</p>
            <button type="button" className="lab2-button lab2-button-secondary" onClick={() => setReloadToken((token) => token + 1)}>Retry</button>
          </div>
        )}
        {empty && (
          <div className="lab2-status lab2-list-empty" role="status">
            <h2>No tickets yet</h2>
            <p>This Requester does not own any Tickets.</p>
            <button type="button" className="lab2-button lab2-button-primary" onClick={() => onCreateTicket?.()}>Create Ticket</button>
          </div>
        )}
        {noResults && (
          <div className="lab2-status lab2-list-empty" role="status">
            <h2>No matching tickets</h2>
            <p>Your current search or filters found no Tickets.</p>
            <button type="button" className="lab2-button lab2-button-secondary" onClick={clearQuery}>Clear search/filters</button>
          </div>
        )}
        {response && response.items.length > 0 && (
          <>
            <div className="lab2-table-wrap">
              <table className="lab2-ticket-table">
                <caption className="visually-hidden">My Tickets</caption>
                <thead><tr>
                  <th scope="col">Ticket Number</th><th scope="col">Created</th><th scope="col">Summary</th>
                  <th scope="col">Category</th><th scope="col">Requested Priority</th><th scope="col">Current Status</th><th scope="col">Last Updated</th><th scope="col">Action</th>
                </tr></thead>
                <tbody>{response.items.map((ticket) => <TicketTableRow key={ticket.id} ticket={ticket} />)}</tbody>
              </table>
            </div>
            <div className="lab2-ticket-cards" aria-label="My Tickets cards">
              {response.items.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)}
            </div>
          </>
        )}
      </div>

      {response && response.totalPages > 0 && (
        <nav className="lab2-pagination" aria-label="My Tickets pagination">
          <button type="button" className="lab2-button lab2-button-secondary" disabled={response.page <= 1}
            onClick={() => setQuery((current) => ({ ...current, page: Math.max(1, response.page - 1) }))}>Previous</button>
          <span aria-live="polite">Page {response.page} of {response.totalPages} ({response.totalItems} total)</span>
          <button type="button" className="lab2-button lab2-button-secondary" disabled={response.totalPages === 0 || response.page >= response.totalPages}
            onClick={() => setQuery((current) => ({ ...current, page: response.page + 1 }))}>Next</button>
        </nav>
      )}
    </section>
  );
}

function TicketTableRow({ ticket }: { ticket: TicketListItem }) {
  return <tr>
    <th scope="row">{ticket.ticketNumber}</th>
    <td>{formatDate(ticket.createdAt)}</td>
    <td className="lab2-summary-cell">{ticket.summary}</td>
    <td>{ticket.category.name}</td>
    <td><span className={`lab2-badge lab2-priority-${ticket.requestedPriority.toLowerCase()}`}>{priorityLabel(ticket.requestedPriority)}</span></td>
    <td><span className="lab2-badge lab2-status-new">New</span></td>
    <td>{formatDate(ticket.updatedAt)}</td>
    <td><button type="button" className="lab2-button lab2-button-secondary lab2-view-ticket" disabled title="Ticket Detail is available in a later increment">View ticket</button></td>
  </tr>;
}

function TicketCard({ ticket }: { ticket: TicketListItem }) {
  return <article className="lab2-ticket-card">
    <h2>{ticket.ticketNumber}</h2>
    <p className="lab2-ticket-card-summary">{ticket.summary}</p>
    <dl>
      <dt>Created</dt><dd>{formatDate(ticket.createdAt)}</dd>
      <dt>Category</dt><dd>{ticket.category.name}</dd>
      <dt>Requested Priority</dt><dd><span className={`lab2-badge lab2-priority-${ticket.requestedPriority.toLowerCase()}`}>{priorityLabel(ticket.requestedPriority)}</span></dd>
      <dt>Current Status</dt><dd><span className="lab2-badge lab2-status-new">New</span></dd>
      <dt>Last Updated</dt><dd>{formatDate(ticket.updatedAt)}</dd>
    </dl>
    <button type="button" className="lab2-button lab2-button-secondary lab2-view-ticket" disabled title="Ticket Detail is available in a later increment">View ticket</button>
  </article>;
}
